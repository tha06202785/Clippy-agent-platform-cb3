#!/usr/bin/env python3
"""
FACEBOOK WEBHOOK HANDLER - Production Version
Real-time lead capture from Facebook comments & DMs
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration from environment
FACEBOOK_VERIFY_TOKEN = os.getenv("FACEBOOK_VERIFY_TOKEN", "clippy-webhook-verify")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
FACEBOOK_PAGE_ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
MAKE_WEBHOOK_URL = os.getenv("MAKE_LEAD_WEBHOOK", "")

class FacebookWebhookHandler:
    """Handle Facebook webhooks for lead capture."""
    
    def __init__(self, verify_token: str = None, app_secret: str = None):
        self.verify_token = verify_token or FACEBOOK_VERIFY_TOKEN
        self.app_secret = app_secret or FACEBOOK_APP_SECRET
    
    def verify(self, mode: str, token: str) -> bool:
        """Verify webhook subscription request."""
        if mode != "subscribe":
            return False
        print(f"Verifying token: received='{token}' expected='{self.verify_token}'")
        return token == self.verify_token
    
    def extract_contact_info(self, message: str) -> Dict[str, Optional[str]]:
        """Extract email and phone from message text."""
        import re
        
        email_match = re.search(r'[\w\.-]+@[\w\.-]+', message)
        phone_match = re.search(r'[\+]?[\d\s\-\(\)]{10,}', message)
        
        return {
            "email": email_match.group() if email_match else None,
            "phone": phone_match.group() if phone_match else None
        }
    
    def handle_comment(self, value: Dict) -> Optional[Dict]:
        """Process new comment on post."""
        
        item_type = value.get("item")
        if item_type != "comment":
            return None
        
        from_user = value.get("from", {})
        message = value.get("message", "")
        
        if not from_user or not message:
            return None
        
        # Extract contact info
        contact_info = self.extract_contact_info(message)
        
        lead_data = {
            "source": "facebook_comment",
            "source_detail": f"post_{value.get('post_id', 'unknown')}",
            "external_id": from_user.get("id"),
            "full_name": from_user.get("name"),
            "message": message,
            "post_id": value.get("post_id"),
            "comment_id": value.get("comment_id"),
            "email": contact_info.get("email"),
            "phone": contact_info.get("phone"),
            "captured_at": datetime.now().isoformat(),
            "platform": "facebook",
            "status": "new",
            "temperature": "warm"
        }
        
        return lead_data
    
    def handle_message(self, messaging: Dict) -> Optional[Dict]:
        """Process new DM/message."""
        
        sender = messaging.get("sender", {})
        message = messaging.get("message", {})
        text = message.get("text", "")
        
        if not sender or not text:
            return None
        
        # Extract contact info
        contact_info = self.extract_contact_info(text)
        
        return {
            "source": "facebook_message",
            "source_detail": "direct_message",
            "external_id": sender.get("id"),
            "full_name": sender.get("name"),
            "message": text,
            "thread_id": messaging.get("thread_id"),
            "message_id": message.get("mid"),
            "email": contact_info.get("email"),
            "phone": contact_info.get("phone"),
            "captured_at": datetime.now().isoformat(),
            "platform": "facebook",
            "status": "new",
            "temperature": "hot"  # DM = hot lead
        }
    
    def process_webhook(self, event: Dict) -> Dict[str, Any]:
        """Process incoming Facebook webhook event."""
        
        object_type = event.get("object")
        
        if object_type != "page":
            print(f"Unknown object type: {object_type}")
            return {"leads": [], "count": 0, "status": "ignored"}
        
        leads = []
        entries = event.get("entry", [])
        
        print(f"Processing {len(entries)} entries")
        
        for entry in entries:
            # Handle messages
            messaging_events = entry.get("messaging", [])
            for messaging in messaging_events:
                lead = self.handle_message(messaging)
                if lead:
                    leads.append(lead)
                    print(f"Captured message lead: {lead.get('full_name')}")
            
            # Handle comments/feed
            changes = entry.get("changes", [])
            for change in changes:
                field = change.get("field")
                value = change.get("value", {})
                
                if field == "feed":
                    lead = self.handle_comment(value)
                    if lead:
                        leads.append(lead)
                        print(f"Captured comment lead: {lead.get('full_name')}")
        
        return {
            "leads": leads,
            "count": len(leads),
            "status": "success"
        }
    
    def forward_to_make(self, lead_data: Dict) -> bool:
        """Forward captured lead to Make.com webhook."""
        import requests
        
        if not MAKE_WEBHOOK_URL:
            print("Warning: MAKE_WEBHOOK_URL not configured")
            return False
        
        try:
            response = requests.post(
                MAKE_WEBHOOK_URL,
                json=lead_data,
                timeout=10,
                headers={"Content-Type": "application/json"}
            )
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"Failed to forward to Make.com: {e}")
            return False


# Express/Netlify Function handler
from http.server import BaseHTTPRequestHandler

class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP Handler for Facebook webhook."""
    
    def do_GET(self):
        """Handle webhook verification (GET request)."""
        from urllib.parse import urlparse, parse_qs
        
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        
        mode = params.get("hub.mode", [""])[0]
        token = params.get("hub.verify_token", [""])[0]
        challenge = params.get("hub.challenge", [""])[0]
        
        print(f"Webhook verification: mode={mode}, token={token}")
        
        handler = FacebookWebhookHandler()
        
        if handler.verify(mode, token):
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(challenge.encode())
            print(f"✓ Webhook verified successfully")
        else:
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Verification failed",
                "mode": mode,
                "token_received": token,
                "expected": handler.verify_token
            }).encode())
            print(f"✗ Verification failed - token mismatch")
    
    def do_POST(self):
        """Handle incoming webhook events (POST request)."""
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        
        print(f"Received webhook payload: {body.decode()[:500]}...")
        
        try:
            event = json.loads(body)
            handler = FacebookWebhookHandler()
            result = handler.process_webhook(event)
            
            # Forward leads to Make.com
            for lead in result["leads"]:
                handler.forward_to_make(lead)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "leads_captured": result["count"]
            }).encode())
            
        except Exception as e:
            print(f"Error processing webhook: {e}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "error",
                "message": str(e)
            }).encode())


# For Netlify Functions
import json as json_module

def handler(event, context):
    """Netlify function handler."""
    
    method = event.get("httpMethod", "GET")
    
    if method == "GET":
        # Verification
        query = event.get("queryStringParameters", {})
        mode = query.get("hub.mode", "")
        token = query.get("hub.verify_token", "")
        challenge = query.get("hub.challenge", "")
        
        fb_handler = FacebookWebhookHandler()
        
        if fb_handler.verify(mode, token):
            return {
                "statusCode": 200,
                "body": challenge
            }
        else:
            return {
                "statusCode": 403,
                "body": json_module.dumps({
                    "error": "Verification failed",
                    "expected": fb_handler.verify_token
                })
            }
    
    elif method == "POST":
        # Event received
        try:
            body = json_module.loads(event.get("body", "{}"))
            fb_handler = FacebookWebhookHandler()
            result = fb_handler.process_webhook(body)
            
            # Forward to Make.com
            for lead in result["leads"]:
                fb_handler.forward_to_make(lead)
            
            return {
                "statusCode": 200,
                "body": json_module.dumps(result)
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "body": json_module.dumps({"error": str(e)})
            }
    
    return {
        "statusCode": 405,
        "body": "Method not allowed"
    }


if __name__ == "__main__":
    # Test mode
    print("Facebook Webhook Handler")
    print(f"Verify Token: {FACEBOOK_VERIFY_TOKEN}")
    print(f"App Secret configured: {'Yes' if FACEBOOK_APP_SECRET else 'No'}")
    print(f"Make.com Webhook: {MAKE_WEBHOOK_URL[:50]}..." if MAKE_WEBHOOK_URL else "Not configured")
