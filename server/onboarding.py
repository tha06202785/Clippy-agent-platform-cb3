"""
Agent Onboarding System for Clippy
Plug & Play connections to Facebook, Email, and other platforms
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

class ConnectionStatus(Enum):
    NOT_CONNECTED = "not_connected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"

@dataclass
class PlatformConnection:
    """Represents a connection to external platform"""
    platform: str  # 'facebook', 'google', 'email', etc.
    status: ConnectionStatus
    account_name: Optional[str]
    account_id: Optional[str]
    last_sync: Optional[str]
    error_message: Optional[str]
    features: List[str]  # What this connection enables

class OnboardingWizard:
    """Step-by-step onboarding for new agents"""
    
    def __init__(self):
        self.steps = [
            {
                'id': 'profile',
                'title': 'Complete Your Profile',
                'description': 'Add your name, photo, and agency details',
                'required': True,
                'estimated_time': '2 min'
            },
            {
                'id': 'facebook',
                'title': 'Connect Facebook',
                'description': 'Import leads from Facebook automatically',
                'required': False,
                'estimated_time': '1 min',
                'features': ['Auto-import leads', 'Post to Facebook', 'Messenger integration']
            },
            {
                'id': 'email',
                'title': 'Connect Email',
                'description': 'Forward inquiry emails to Clippy',
                'required': False,
                'estimated_time': '2 min',
                'features': ['Auto-parse inquiries', 'Email templates', 'Reply tracking']
            },
            {
                'id': 'calendar',
                'title': 'Connect Calendar',
                'description': 'Sync inspections and meetings',
                'required': False,
                'estimated_time': '1 min',
                'features': ['Auto-schedule inspections', 'Meeting reminders', 'Blockout times']
            },
            {
                'id': 'qr_codes',
                'title': 'Set Up QR Codes',
                'description': 'Create QR codes for listings',
                'required': False,
                'estimated_time': '3 min',
                'features': ['Lead capture signs', 'Print materials', 'SMS capture']
            }
        ]
    
    def get_progress(self, completed_steps: List[str]) -> Dict:
        """Calculate onboarding progress"""
        required_steps = [s for s in self.steps if s['required']]
        optional_steps = [s for s in self.steps if not s['required']]
        
        required_done = len([s for s in required_steps if s['id'] in completed_steps])
        optional_done = len([s for s in optional_steps if s['id'] in completed_steps])
        
        return {
            'required_completed': required_done,
            'required_total': len(required_steps),
            'optional_completed': optional_done,
            'optional_total': len(optional_steps),
            'percent_complete': int((required_done / len(required_steps)) * 100) if required_steps else 100,
            'can_launch': required_done == len(required_steps)
        }

class FacebookConnector:
    """Simplified Facebook connection flow"""
    
    def __init__(self):
        self.oauth_url = "https://www.facebook.com/v18.0/dialog/oauth"
        self.scopes = [
            'pages_manage_posts',
            'pages_read_engagement', 
            'leads_retrieval',
            'pages_messaging'
        ]
    
    def get_connect_url(self, org_id: str, redirect_uri: str) -> str:
        """Generate Facebook OAuth URL"""
        import urllib.parse
        
        params = {
            'client_id': '{FACEBOOK_APP_ID}',  # Replace with actual
            'redirect_uri': redirect_uri,
            'scope': ','.join(self.scopes),
            'state': org_id,  # For security
            'response_type': 'code'
        }
        
        query_string = urllib.parse.urlencode(params)
        return f"{self.oauth_url}?{query_string}"
    
    def handle_callback(self, code: str, org_id: str) -> Dict:
        """Handle OAuth callback from Facebook"""
        # Exchange code for access token
        # Get user's pages
        # Save to database
        
        return {
            'success': True,
            'message': 'Facebook connected successfully',
            'pages': []  # List of available pages
        }
    
    def get_pages(self, access_token: str) -> List[Dict]:
        """Get pages user can manage"""
        return [
            {
                'id': 'page_123',
                'name': 'Real Estate Sydney',
                'category': 'Real Estate',
                'connected': False
            }
        ]
    
    def connect_page(self, page_id: str, access_token: str, org_id: str) -> Dict:
        """Connect specific page to Clippy"""
        # Subscribe to webhooks
        # Save page access token
        # Enable lead sync
        
        return {
            'success': True,
            'page_id': page_id,
            'features_enabled': [
                'Lead ad sync',
                'Post scheduling',
                'Message replies'
            ]
        }

class EmailConnector:
    """Email forwarding setup"""
    
    def __init__(self):
        self.forwarding_address = "leads@clippy.useclippy.com"
    
    def get_setup_instructions(self, org_id: str) -> Dict:
        """Get email forwarding instructions"""
        unique_email = f"{org_id}@inbound.clippy.com"
        
        return {
            'unique_address': unique_email,
            'instructions': {
                'gmail': [
                    'Go to Gmail Settings',
                    'Click "Forwarding and POP/IMAP"',
                    'Click "Add a forwarding address"',
                    f'Enter: {unique_email}',
                    'Verify and confirm'
                ],
                'outlook': [
                    'Go to Outlook Settings',
                    'Click "Mail" → "Forwarding"',
                    f'Enter: {unique_email}',
                    'Save'
                ],
                'generic': [
                    f'Forward inquiry emails to: {unique_email}',
                    'Or CC this address on all inquiries',
                    'Clippy will auto-parse and create leads'
                ]
            },
            'test_email': f"Send test to {unique_email} to verify"
        }

# Connection manager API
class ConnectionManager:
    """Manage all platform connections"""
    
    def __init__(self):
        self.connectors = {
            'facebook': FacebookConnector(),
            'email': EmailConnector()
        }
    
    def get_status(self, org_id: str) -> List[PlatformConnection]:
        """Get connection status for organization"""
        # Query database for connections
        return [
            PlatformConnection(
                platform='facebook',
                status=ConnectionStatus.NOT_CONNECTED,
                account_name=None,
                account_id=None,
                last_sync=None,
                error_message=None,
                features=['Lead ads', 'Page posts', 'Messenger']
            ),
            PlatformConnection(
                platform='email',
                status=ConnectionStatus.NOT_CONNECTED,
                account_name=None,
                account_id=None,
                last_sync=None,
                error_message=None,
                features=['Inquiry parsing', 'Auto-replies']
            )
        ]
    
    def connect(self, platform: str, org_id: str, **kwargs) -> Dict:
        """Initiate connection to platform"""
        if platform not in self.connectors:
            return {'error': 'Platform not supported'}
        
        connector = self.connectors[platform]
        
        if platform == 'facebook':
            return {'oauth_url': connector.get_connect_url(org_id, kwargs.get('redirect_uri'))}
        
        elif platform == 'email':
            return connector.get_setup_instructions(org_id)
        
        return {'error': 'Connection method not implemented'}

# Global instances
onboarding = OnboardingWizard()
connections = ConnectionManager()

# API helpers
def get_onboarding_status(org_id: str, completed_steps: List[str]) -> Dict:
    """Get current onboarding progress"""
    return onboarding.get_progress(completed_steps)

def get_connection_instructions(platform: str, org_id: str) -> Dict:
    """Get step-by-step connection instructions"""
    return connections.connect(platform, org_id)

def get_quick_start_guide() -> Dict:
    """Quick start guide for new agents"""
    return {
        'title': 'Get Started in 3 Steps',
        'steps': [
            {
                'step': 1,
                'action': 'Complete profile',
                'time': '2 min',
                'why': 'So leads know who you are'
            },
            {
                'step': 2,
                'action': 'Connect Facebook (optional)',
                'time': '1 min', 
                'why': 'Auto-import leads from Facebook ads'
            },
            {
                'step': 3,
                'action': 'Create your first listing',
                'time': '3 min',
                'why': 'Generate QR codes and start capturing leads'
            }
        ],
        'tip': 'You can start using Clippy immediately after Step 1!'
    }
