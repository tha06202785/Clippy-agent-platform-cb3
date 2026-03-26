#!/usr/bin/env python3
"""
Webhook Receiver for Make.com
Ready to receive webhooks once scenarios are created
"""

from flask import Flask, request, jsonify
import json
import hmac
import hashlib
import os
from datetime import datetime
from integration_logs import logger
from idempotency import checker

app = Flask(__name__)

WEBHOOK_SECRET = os.getenv('MAKE_WEBHOOK_SECRET', '18f57bfe886502d81496a78b4b023b0d86746ea9253ccf1454f0912463e22a8a')

@app.route('/webhook/make/lead', methods=['POST'])
def handle_lead_webhook():
    """Receive lead from Make.com"""
    data = request.get_json() or {}
    
    # Check idempotency
    webhook_id = data.get('id', request.headers.get('X-Webhook-Id', ''))
    is_dup, _ = checker.check_or_execute('make_lead', {'id': webhook_id})
    
    if is_dup:
        logger.log('make.com', 'lead_capture', 'skipped', data, note='Duplicate webhook')
        return jsonify({'status': 'skipped', 'reason': 'Duplicate'})
    
    # Process lead
    lead_data = {
        'name': data.get('name', 'Unknown'),
        'email': data.get('email'),
        'phone': data.get('phone'),
        'source': 'make.com',
        'source_detail': data.get('source_detail'),
        'status': 'new',
        'created_at': datetime.utcnow().isoformat()
    }
    
    logger.log('make.com', 'lead_capture', 'success', lead_data)
    return jsonify({'status': 'success', 'lead': lead_data})

@app.route('/webhook/make/ai-reply', methods=['POST'])
def handle_ai_reply_webhook():
    """Receive AI reply from Make.com"""
    data = request.get_json() or {}
    
    logger.log('make.com', 'ai_reply', 'success', data)
    return jsonify({'status': 'success', 'message': 'AI reply received'})

@app.route('/webhook/make/facebook', methods=['POST'])
def handle_facebook_webhook():
    """Receive Facebook post confirmation from Make.com"""
    data = request.get_json() or {}
    
    logger.log('make.com', 'facebook_post', 'success', data)
    return jsonify({'status': 'success', 'message': 'Facebook post confirmed'})

@app.route('/webhook/make/reminder', methods=['POST'])
def handle_reminder_webhook():
    """Receive daily reminder from Make.com"""
    data = request.get_json() or {}
    
    logger.log('make.com', 'daily_reminder', 'success', data)
    return jsonify({'status': 'success', 'message': 'Reminder received'})

@app.route('/webhook/make/setup', methods=['POST'])
def setup_webhook():
    """Receive webhook configuration from Make.com"""
    data = request.get_json() or {}
    
    # Save webhook URL
    webhook_type = data.get('type')
    webhook_url = data.get('url')
    
    if webhook_type and webhook_url:
        config_file = f'/tmp/webhook_config_{webhook_type}.json'
        with open(config_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.log('make.com', 'webhook_setup', 'success', data)
        return jsonify({'status': 'success', 'message': f'Webhook {webhook_type} configured'})
    
    return jsonify({'status': 'error', 'message': 'Missing type or url'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=False)
