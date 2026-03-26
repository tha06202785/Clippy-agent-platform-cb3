"""
Facebook Lead Ads Integration for Clippy
Handles webhook from Facebook Lead Ads
"""

import json
import hmac
import hashlib
from datetime import datetime
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class FacebookLead:
    """Structured Facebook lead data"""
    lead_id: str
    form_id: str
    ad_id: str
    page_id: str
    created_time: datetime
    field_data: Dict[str, str]  # All form fields
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    full_name: Optional[str]
    post_code: Optional[str]
    custom_questions: Dict[str, str]

class FacebookLeadHandler:
    """Process Facebook Lead Ads webhooks"""
    
    def __init__(self, app_secret: Optional[str] = None):
        self.app_secret = app_secret
        
    def verify_webhook(self, signature: str, payload: str) -> bool:
        """Verify Facebook webhook signature"""
        if not self.app_secret:
            # Skip verification if no secret (development)
            return True
        
        expected = hmac.new(
            self.app_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, f"sha256={expected}")
    
    def process_lead(self, webhook_data: Dict) -> FacebookLead:
        """Process Facebook lead webhook data"""
        entry = webhook_data.get('entry', [{}])[0]
        changes = entry.get('changes', [{}])[0]
        value = changes.get('value', {})
        
        lead_id = value.get('leadgen_id')
        form_id = value.get('form_id')
        ad_id = value.get('ad_id')
        page_id = value.get('page_id')
        created_time = value.get('created_time')
        
        # Parse field data
        field_data = {}
        for field in value.get('field_data', []):
            field_data[field['name']] = field['values'][0] if field['values'] else ''
        
        # Extract common fields
        name = self._extract_name(field_data)
        email = field_data.get('email')
        phone = field_data.get('phone_number')
        full_name = field_data.get('full_name')
        post_code = field_data.get('post_code') or field_data.get('zip_code')
        
        # Get custom questions
        custom = {k: v for k, v in field_data.items() 
                  if k not in ['email', 'phone_number', 'full_name', 'name', 
                              'first_name', 'last_name', 'post_code', 'zip_code']}
        
        return FacebookLead(
            lead_id=lead_id,
            form_id=form_id,
            ad_id=ad_id,
            page_id=page_id,
            created_time=datetime.fromtimestamp(created_time) if created_time else datetime.now(),
            field_data=field_data,
            name=name,
            email=email,
            phone=phone,
            full_name=full_name,
            post_code=post_code,
            custom_questions=custom
        )
    
    def _extract_name(self, field_data: Dict) -> Optional[str]:
        """Extract name from various possible fields"""
        # Try full_name first
        if 'full_name' in field_data:
            return field_data['full_name']
        
        # Try name field
        if 'name' in field_data:
            return field_data['name']
        
        # Combine first + last
        first = field_data.get('first_name', '')
        last = field_data.get('last_name', '')
        if first or last:
            return f"{first} {last}".strip()
        
        return None
    
    def to_clippy_lead(self, fb_lead: FacebookLead, org_id: str) -> Dict:
        """Convert Facebook lead to Clippy format"""
        # Build AI summary from custom questions
        ai_parts = []
        for q, a in fb_lead.custom_questions.items():
            ai_parts.append(f"{q}: {a}")
        
        ai_summary = " | ".join(ai_parts) if ai_parts else "Facebook Lead Ad"
        
        return {
            'org_id': org_id,
            'name': fb_lead.name or fb_lead.full_name or 'Facebook Lead',
            'email': fb_lead.email,
            'phone': fb_lead.phone,
            'source': 'facebook_lead_ad',
            'source_detail': f"Form: {fb_lead.form_id}",
            'status': 'new',
            'temperature': 'warm',  # FB leads are usually warm
            'post_code': fb_lead.post_code,
            'ai_summary': ai_summary[:500],
            'created_at': fb_lead.created_time.isoformat(),
            'facebook_lead_id': fb_lead.lead_id,
            'facebook_ad_id': fb_lead.ad_id,
            'raw_data': fb_lead.field_data
        }
    
    def get_test_lead(self) -> FacebookLead:
        """Generate a test lead for development"""
        return FacebookLead(
            lead_id='test_123456',
            form_id='test_form_789',
            ad_id='test_ad_999',
            page_id='test_page_111',
            created_time=datetime.now(),
            field_data={
                'full_name': 'John Test',
                'email': 'john@test.com',
                'phone_number': '+61400123456',
                'post_code': '2000',
                'what_are_you_looking_for': 'Buying a home',
                'budget_range': '$500k-$700k'
            },
            name='John Test',
            email='john@test.com',
            phone='+61400123456',
            full_name='John Test',
            post_code='2000',
            custom_questions={
                'what_are_you_looking_for': 'Buying a home',
                'budget_range': '$500k-$700k'
            }
        )

# Webhook handler API
def handle_facebook_webhook(request_data: Dict, signature: str = None, 
                           app_secret: str = None, org_id: str = None) -> Dict:
    """
    Main webhook handler for Facebook Lead Ads
    
    Args:
        request_data: JSON payload from Facebook
        signature: X-Hub-Signature-256 header
        app_secret: Facebook app secret for verification
        org_id: Organization ID in Clippy
    
    Returns:
        Dict with status and lead data
    """
    handler = FacebookLeadHandler(app_secret)
    
    # Verify signature
    if signature and not handler.verify_webhook(signature, json.dumps(request_data)):
        return {'status': 'error', 'message': 'Invalid signature'}
    
    # Process lead
    try:
        fb_lead = handler.process_lead(request_data)
        clippy_lead = handler.to_clippy_lead(fb_lead, org_id)
        
        return {
            'status': 'success',
            'lead': clippy_lead,
            'facebook_lead_id': fb_lead.lead_id
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
            'raw_data': request_data
        }

# Graph API client for fetching leads
class FacebookGraphAPI:
    """Client for Facebook Graph API"""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://graph.facebook.com/v18.0"
    
    def get_lead(self, lead_id: str) -> Optional[Dict]:
        """Fetch lead data from Graph API"""
        import requests
        
        url = f"{self.base_url}/{lead_id}"
        params = {
            'access_token': self.access_token,
            'fields': 'id,ad_id,form_id,created_time,field_data'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching lead: {e}")
            return None
    
    def get_form(self, form_id: str) -> Optional[Dict]:
        """Fetch form details"""
        import requests
        
        url = f"{self.base_url}/{form_id}"
        params = {
            'access_token': self.access_token,
            'fields': 'id,name,questions'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching form: {e}")
            return None
