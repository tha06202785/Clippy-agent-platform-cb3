#!/usr/bin/env python3
"""
FACEBOOK WEBHOOK HANDLER
Real-time lead capture from Facebook comments & DMs
"""

import json
import hmac
import hashlib
from datetime import datetime
from typing import Dict, Any

class FacebookWebhookHandler:
    """Handle Facebook webhooks for lead capture."""
    
    def __init__(self, app_secret: str, verify_token: str):
        self.app_secret = app_secret
        self.verify_token = verify_token
    
    def verify_signature(self, payload: bytes, signature: str) -> bool:
        """Verify Facebook webhook signature."""
        expected = hmac.new(
            self.app_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)
    
    def handle_comment(self, data: Dict) -> Dict:
        """Process new comment on post."""
        
        comment_id = data.get("comment_id")
        post_id = data.get("post_id")
        message = data.get("message", "")
        from_user = data.get("from", {})
        
        # Extract lead info
        lead_data = {
            "source": "facebook_comment",
            "external_id": from_user.get("id"),
            "full_name": from_user.get("name"),
            "message": message,
            "post_id": post_id,
            "comment_id": comment_id,
            "captured_at": datetime.now().isoformat()
        }
        
        # Extract email/phone if in comment
        import re
        email_match = re.search(r'[\w\.-]+@[\w\.-]+', message)
        phone_match = re.search(r'[\+]?[\d\s\-\(\)]{10,}', message)
        
        if email_match:
            lead_data["email"] = email_match.group()
        if phone_match:
            lead_data["phone"] = phone_match.group()
        
        return lead_data
    
    def handle_message(self, data: Dict) -> Dict:
        """Process new DM/message."""
        
        sender = data.get("sender", {})
        message = data.get("message", {}).get("text", "")
        
        return {
            "source": "facebook_message",
            "external_id": sender.get("id"),
            "full_name": sender.get("name"),
            "message": message,
            "thread_id": data.get("thread_id"),
            "captured_at": datetime.now().isoformat()
        }
    
    def process_webhook(self, event: Dict) -> Dict:
        """Process incoming Facebook webhook."""
        
        object_type = event.get("object")
        
        if object_type == "page":
            entries = event.get("entry", [])
            leads = []
            
            for entry in entries:
                changes = entry.get("changes", [])
                
                for change in changes:
                    field = change.get("field")
                    value = change.get("value", {})
                    
                    if field == "feed" and value.get("item") == "comment":
                        lead = self.handle_comment(value)
                        leads.append(lead)
                    
                    elif field == "messages":
                        lead = self.handle_message(value)
                        leads.append(lead)
            
            return {"leads": leads, "count": len(leads)}
        
        return {"leads": [], "count": 0}

# FastAPI endpoint for webhook
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/webhook/facebook")
async def verify_webhook(request: Request):
    """Verify webhook for Facebook."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    handler = FacebookWebhookHandler("", "clippy_verify_token")
    
    if mode == "subscribe" and token == handler.verify_token:
        return int(challenge)
    
    raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/webhook/facebook")
async def receive_webhook(request: Request):
    """Receive Facebook webhook events."""
    
    handler = FacebookWebhookHandler("app_secret", "clippy_verify_token")
    
    # Verify signature
    signature = request.headers.get("X-Hub-Signature-256")
    body = await request.body()
    
    if not handler.verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Process event
    event = await request.json()
    result = handler.process_webhook(event)
    
    # Store leads in database (via Supabase)
    for lead_data in result["leads"]:
        # Call your lead capture API here
        print(f"Captured lead: {lead_data}")
    
    return JSONResponse({"status": "success", "leads_captured": result["count"]})
