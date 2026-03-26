"""
Complete Webhook Handler for Clippy
Handles all incoming webhooks with security and logging
"""

from flask import Flask, request, jsonify
import json
import hmac
import hashlib
import os
from datetime import datetime
from typing import Dict, Optional
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from integration_logs import logger
from idempotency import checker
from background_worker import worker
from email_parser import parse_incoming_email, parse_text_form
from facebook_integration import handle_facebook_webhook

app = Flask(__name__)

# Configuration (load from environment in production)
WEBHOOK_SECRETS = {
    'make_com': os.getenv('WEBHOOK_SECRET_MAKE', 'dev_secret'),
    'facebook': os.getenv('FACEBOOK_APP_SECRET', None),
}

class WebhookProcessor:
    """Process all incoming webhooks"""
    
    def __init__(self):
        self.worker = worker
    
    def verify_signature(self, payload: str, signature: str, secret: str) -> bool:
        """Verify HMAC signature"""
        if not secret:
            return True  # Skip in dev
        
        expected = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Handle both 'sha256=abc' and raw hex formats
        if signature.startswith('sha256='):
            signature = signature[7:]
        
        return hmac.compare_digest(expected, signature)
    
    def process_make_webhook(self, data: Dict, org_id: str) -> Dict:
        """Process Make.com webhook"""
        # Check idempotency
        webhook_id = data.get('webhook_id') or data.get('timestamp', '')
        is_dup, result = checker.check_or_execute(
            'make_webhook',
            {'id': webhook_id, 'type': data.get('event_type')},
            org_id
        )
        
        if is_dup:
            logger.log(
                source='make.com',
                event_type='duplicate_webhook',
                status='skipped',
                org_id=org_id
            )
            return {'status': 'success', 'message': 'Duplicate webhook', 'lead_id': result}
        
        # Process based on event type
        event_type = data.get('event_type', 'unknown')
        
        if event_type == 'lead_capture':
            lead_data = data.get('lead', {})
            lead_data['org_id'] = org_id
            lead_data['source'] = lead_data.get('source', 'make.com')
            
            # Log success
            logger.log(
                source='make.com',
                event_type='lead_capture',
                status='success',
                payload=data,
                org_id=org_id,
                lead_id=lead_data.get('id')
            )
            
            # Record for idempotency
            checker.record_success(
                'make_webhook',
                {'id': webhook_id, 'type': event_type},
                lead_data.get('id'),
                org_id
            )
            
            return {
                'status': 'success',
                'message': 'Lead captured',
                'lead_id': lead_data.get('id')
            }
        
        elif event_type == 'ai_reply_generated':
            # AI reply was generated
            logger.log(
                source='make.com',
                event_type='ai_reply',
                status='success',
                payload=data,
                org_id=org_id
            )
            return {'status': 'success', 'message': 'AI reply processed'}
        
        else:
            return {'status': 'unknown_event', 'event_type': event_type}
    
    def process_email_webhook(self, data: Dict, org_id: str) -> Dict:
        """Process email webhook"""
        try:
            # Parse email
            email_bytes = data.get('email_raw', '').encode()
            subject = data.get('subject', '')
            
            lead_dict = parse_incoming_email(email_bytes, subject, org_id)
            
            # Check if it's a valid lead
            if lead_dict.get('confidence', 0) < 0.3:
                logger.log(
                    source='email',
                    event_type='low_confidence',
                    status='warning',
                    payload=data,
                    org_id=org_id,
                    error_message='Could not parse lead from email'
                )
                return {'status': 'warning', 'message': 'Low confidence parse'}
            
            # Log success
            logger.log(
                source='email',
                event_type='lead_parsed',
                status='success',
                payload=lead_dict,
                org_id=org_id
            )
            
            return {
                'status': 'success',
                'message': 'Lead parsed from email',
                'lead': lead_dict
            }
            
        except Exception as e:
            logger.log(
                source='email',
                event_type='parse_error',
                status='error',
                payload=data,
                org_id=org_id,
                error_message=str(e)
            )
            return {'status': 'error', 'message': str(e)}
    
    def process_qr_webhook(self, data: Dict, org_id: str) -> Dict:
        """Process QR code scan webhook"""
        # QR scan creates a lead
        lead_data = {
            'org_id': org_id,
            'source': 'qr_code',
            'source_detail': data.get('listing_id'),
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'status': 'new',
            'temperature': 'warm',
            'ai_summary': f"QR scan from listing {data.get('listing_id')}",
            'created_at': datetime.utcnow().isoformat()
        }
        
        logger.log(
            source='qr_code',
            event_type='scan_capture',
            status='success',
            payload=lead_data,
            org_id=org_id
        )
        
        return {
            'status': 'success',
            'message': 'QR lead captured',
            'lead': lead_data
        }

# Global processor
processor = WebhookProcessor()

# Flask Routes
@app.route('/webhook/make', methods=['POST'])
def webhook_make():
    """Make.com webhook endpoint"""
    signature = request.headers.get('X-Webhook-Signature', '')
    
    if not processor.verify_signature(
        request.get_data(as_text=True), 
        signature, 
        WEBHOOK_SECRETS['make_com']
    ):
        return jsonify({'status': 'error', 'message': 'Invalid signature'}), 401
    
    data = request.get_json()
    org_id = data.get('org_id') or request.args.get('org_id')
    
    if not org_id:
        return jsonify({'status': 'error', 'message': 'Missing org_id'}), 400
    
    result = processor.process_make_webhook(data, org_id)
    return jsonify(result)

@app.route('/webhook/facebook', methods=['POST', 'GET'])
def webhook_facebook():
    """Facebook Lead Ads webhook endpoint"""
    # Facebook verification challenge
    if request.method == 'GET':
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')
        
        if mode == 'subscribe':
            return challenge, 200
        return 'Forbidden', 403
    
    # Process lead
    signature = request.headers.get('X-Hub-Signature-256', '')
    data = request.get_json()
    org_id = request.args.get('org_id')
    
    if not org_id:
        return jsonify({'status': 'error', 'message': 'Missing org_id'}), 400
    
    result = handle_facebook_webhook(
        data, 
        signature, 
        WEBHOOK_SECRETS['facebook'], 
        org_id
    )
    
    return jsonify(result)

@app.route('/webhook/email', methods=['POST'])
def webhook_email():
    """Email parsing webhook endpoint"""
    data = request.get_json()
    org_id = request.args.get('org_id') or data.get('org_id')
    
    if not org_id:
        return jsonify({'status': 'error', 'message': 'Missing org_id'}), 400
    
    result = processor.process_email_webhook(data, org_id)
    return jsonify(result)

@app.route('/webhook/qr', methods=['POST'])
def webhook_qr():
    """QR code scan webhook"""
    data = request.get_json()
    org_id = request.args.get('org_id') or data.get('org_id')
    
    if not org_id:
        return jsonify({'status': 'error', 'message': 'Missing org_id'}), 400
    
    result = processor.process_qr_webhook(data, org_id)
    return jsonify(result)

# Health check
@app.route('/webhook/health', methods=['GET'])
def health_check():
    """Webhook service health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'endpoints': ['make', 'facebook', 'email', 'qr']
    })

if __name__ == '__main__':
    # Start background worker
    worker.start()
    
    try:
        app.run(host='0.0.0.0', port=5001, debug=False)
    finally:
        worker.stop()
