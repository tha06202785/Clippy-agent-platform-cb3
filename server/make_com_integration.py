"""
Make.com Integration for Clippy
Automated workflow activation and webhook handling
"""

import os
import json
import requests
from typing import Dict, List, Optional, Tuple
from datetime import datetime

class MakeComIntegration:
    """
    Integrate Clippy with Make.com automation
    Handles webhooks, scenario triggers, and data sync
    """
    
    def __init__(self):
        self.api_token = os.getenv('MAKE_COM_API_TOKEN')
        self.base_url = "https://eu1.make.com/api/v2"
        self.org_id = os.getenv('MAKE_COM_ORG_ID')
        self.team_id = os.getenv('MAKE_COM_TEAM_ID')
        
        self.webhook_secret = os.getenv('MAKE_WEBHOOK_SECRET', 'dev-secret')
        
    def verify_connection(self) -> Tuple[bool, str]:
        """Verify Make.com API connection"""
        if not self.api_token:
            return False, "Missing MAKE_COM_API_TOKEN environment variable"
        
        try:
            response = requests.get(
                f"{self.base_url}/users/me",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return True, f"Connected as {user_data.get('name', 'Unknown')}"
            else:
                return False, f"Connection failed: {response.status_code}"
                
        except Exception as e:
            return False, f"Connection error: {str(e)}"
    
    def list_scenarios(self) -> List[Dict]:
        """List all Make.com scenarios"""
        if not self.api_token:
            return []
        
        try:
            response = requests.get(
                f"{self.base_url}/scenarios",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('scenarios', [])
            else:
                print(f"Failed to list scenarios: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"Error listing scenarios: {e}")
            return []
    
    def activate_scenario(self, scenario_id: str) -> Tuple[bool, str]:
        """Activate a specific scenario"""
        if not self.api_token:
            return False, "No API token"
        
        try:
            response = requests.post(
                f"{self.base_url}/scenarios/{scenario_id}/start",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code in [200, 201]:
                return True, "Scenario activated successfully"
            else:
                return False, f"Failed to activate: {response.status_code}"
                
        except Exception as e:
            return False, f"Error activating: {str(e)}"
    
    def deactivate_scenario(self, scenario_id: str) -> Tuple[bool, str]:
        """Deactivate a specific scenario"""
        if not self.api_token:
            return False, "No API token"
        
        try:
            response = requests.post(
                f"{self.base_url}/scenarios/{scenario_id}/stop",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code in [200, 201]:
                return True, "Scenario deactivated"
            else:
                return False, f"Failed to deactivate: {response.status_code}"
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def get_scenario_status(self, scenario_id: str) -> Dict:
        """Get current status of a scenario"""
        if not self.api_token:
            return {'error': 'No API token'}
        
        try:
            response = requests.get(
                f"{self.base_url}/scenarios/{scenario_id}",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'Status {response.status_code}'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def activate_all_clippy_scenarios(self) -> Dict:
        """
        Activate all Clippy-related scenarios
        Expected scenarios:
        - Lead Capture
        - AI Reply Drafts  
        - Facebook Posts
        - Daily Reminders
        """
        results = {
            'success': [],
            'failed': [],
            'total': 0
        }
        
        scenarios = self.list_scenarios()
        
        for scenario in scenarios:
            name = scenario.get('name', 'Unknown').lower()
            scenario_id = scenario.get('id')
            
            # Check if it's a Clippy scenario
            if any(keyword in name for keyword in ['clippy', 'lead', 'ai', 'facebook', 'daily']):
                results['total'] += 1
                success, message = self.activate_scenario(scenario_id)
                
                if success:
                    results['success'].append({
                        'id': scenario_id,
                        'name': name,
                        'message': message
                    })
                else:
                    results['failed'].append({
                        'id': scenario_id,
                        'name': name,
                        'error': message
                    })
        
        return results
    
    def get_connection_credentials(self, connection_type: str) -> Optional[Dict]:
        """
        Extract credentials from Make.com connections
        connection_type: 'facebook', 'supabase', 'openai'
        """
        if not self.api_token:
            return None
        
        try:
            response = requests.get(
                f"{self.base_url}/connections",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                connections = data.get('connections', [])
                
                for conn in connections:
                    if connection_type.lower() in conn.get('name', '').lower():
                        return {
                            'id': conn.get('id'),
                            'name': conn.get('name'),
                            'type': conn.get('type'),
                            'note': 'Credentials stored in Make.com, extract via UI'
                        }
                
                return None
            else:
                return None
                
        except Exception as e:
            print(f"Error getting credentials: {e}")
            return None
    
    def trigger_webhook(self, webhook_url: str, data: Dict) -> Tuple[bool, str]:
        """Trigger a Make.com webhook manually"""
        try:
            response = requests.post(
                webhook_url,
                json=data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return True, "Webhook triggered successfully"
            else:
                return False, f"Webhook failed: {response.status_code}"
                
        except Exception as e:
            return False, f"Error: {str(e)}"
    
    def get_webhook_status(self, webhook_id: str) -> Dict:
        """Get status of a webhook"""
        if not self.api_token:
            return {'error': 'No API token'}
        
        try:
            response = requests.get(
                f"{self.base_url}/hooks/{webhook_id}",
                headers={"Authorization": f"Token {self.api_token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'Status {response.status_code}'}
                
        except Exception as e:
            return {'error': str(e)}


# Webhook handlers for incoming data from Make.com
class MakeComWebhookHandler:
    """Handle webhooks from Make.com"""
    
    def __init__(self):
        self.webhook_secret = os.getenv('MAKE_WEBHOOK_SECRET', 'dev-secret')
    
    def verify_signature(self, signature: str, payload: str) -> bool:
        """Verify webhook signature"""
        import hmac
        import hashlib
        
        expected = hmac.new(
            self.webhook_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected)
    
    def handle_lead_capture(self, data: Dict) -> Dict:
        """Process lead from Make.com webhook"""
        from integration_logs import logger
        from idempotency import checker
        
        # Check for duplicates
        webhook_id = data.get('id', '')
        is_dup, _ = checker.check_or_execute('make_webhook', {'id': webhook_id})
        
        if is_dup:
            logger.log(
                source='make.com',
                event_type='duplicate_webhook',
                status='skipped',
                payload=data
            )
            return {'status': 'skipped', 'reason': 'Duplicate webhook'}
        
        # Extract lead data
        lead_data = {
            'name': data.get('name', 'Unknown'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'source': data.get('source', 'make.com'),
            'source_detail': data.get('source_detail'),
            'status': 'new',
            'temperature': 'warm',
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Log success
        logger.log(
            source='make.com',
            event_type='lead_capture',
            status='success',
            payload=lead_data,
            lead_id=lead_data.get('id')
        )
        
        return {
            'status': 'success',
            'message': 'Lead captured',
            'lead': lead_data
        }
    
    def handle_ai_reply(self, data: Dict) -> Dict:
        """Process AI reply from Make.com"""
        from integration_logs import logger
        
        logger.log(
            source='make.com',
            event_type='ai_reply',
            status='success',
            payload=data
        )
        
        return {'status': 'success', 'message': 'AI reply processed'}
    
    def handle_facebook_post(self, data: Dict) -> Dict:
        """Process Facebook post confirmation"""
        from integration_logs import logger
        
        logger.log(
            source='make.com',
            event_type='facebook_post',
            status='success',
            payload=data
        )
        
        return {'status': 'success', 'message': 'Facebook post confirmed'}


# API endpoints
make_com = MakeComIntegration()
webhook_handler = MakeComWebhookHandler()

def verify_make_connection() -> Tuple[bool, str]:
    """Verify Make.com connection"""
    return make_com.verify_connection()

def activate_all_scenarios() -> Dict:
    """Activate all Clippy scenarios"""
    return make_com.activate_all_clippy_scenarios()

def handle_incoming_webhook(webhook_type: str, data: Dict) -> Dict:
    """Handle incoming webhook from Make.com"""
    if webhook_type == 'lead_capture':
        return webhook_handler.handle_lead_capture(data)
    elif webhook_type == 'ai_reply':
        return webhook_handler.handle_ai_reply(data)
    elif webhook_type == 'facebook_post':
        return webhook_handler.handle_facebook_post(data)
    else:
        return {'status': 'error', 'message': 'Unknown webhook type'}

if __name__ == '__main__':
    # Test connection
    connected, message = verify_make_connection()
    print(f"Make.com Connection: {'✅' if connected else '❌'} {message}")
    
    if connected:
        # List scenarios
        print("\n📋 Scenarios:")
        scenarios = make_com.list_scenarios()
        for scenario in scenarios[:5]:
            print(f"  - {scenario.get('name')} (ID: {scenario.get('id')})")
        
        # Try to activate Clippy scenarios
        print("\n🚀 Activating Clippy scenarios...")
        results = activate_all_scenarios()
        print(f"  Success: {len(results['success'])}")
        print(f"  Failed: {len(results['failed'])}")
