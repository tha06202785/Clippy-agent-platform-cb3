import pytest
import json
from datetime import datetime
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from integration_logs import logger, log_integration
from idempotency import checker, idempotent
from email_parser import parser, parse_text_form
from facebook_integration import FacebookLeadHandler, handle_facebook_webhook

class TestIntegrationLogs:
    """Test integration logging system"""
    
    def test_log_creation(self):
        """Test that logs are created"""
        log_id = logger.log(
            source='test',
            event_type='test_event',
            status='success',
            payload={'test': 'data'}
        )
        
        assert log_id is not None
        assert len(log_id) > 0
        
        # Verify log exists
        logs = logger.get_logs(source='test', limit=1)
        assert len(logs) > 0
        assert logs[0]['source'] == 'test'
    
    def test_log_filters(self):
        """Test log filtering"""
        # Create test logs
        logger.log(source='filter_test', event_type='type1', status='success')
        logger.log(source='filter_test', event_type='type2', status='error')
        
        # Filter by status
        logs = logger.get_logs(source='filter_test', status='error')
        assert len(logs) >= 1

class TestIdempotency:
    """Test idempotency system"""
    
    def test_duplicate_detection(self):
        """Test that duplicates are detected"""
        payload = {'lead': 'test123', 'email': 'test@test.com'}
        
        # First check - not duplicate
        is_dup, result = checker.check_or_execute('lead_create', payload, 'org1')
        assert is_dup is False
        
        # Record success
        checker.record_success('lead_create', payload, {'id': 'lead_123'}, 'org1')
        
        # Second check - should be duplicate
        is_dup, result = checker.check_or_execute('lead_create', payload, 'org1')
        assert is_dup is True
        assert result == {'id': 'lead_123'}
    
    def test_different_payloads(self):
        """Test that different payloads are not duplicates"""
        payload1 = {'lead': 'test1', 'email': 'a@test.com'}
        payload2 = {'lead': 'test2', 'email': 'b@test.com'}
        
        is_dup1, _ = checker.check_or_execute('lead_create', payload1, 'org1')
        assert is_dup1 is False
        
        checker.record_success('lead_create', payload1, {'id': '1'}, 'org1')
        
        is_dup2, _ = checker.check_or_execute('lead_create', payload2, 'org1')
        assert is_dup2 is False  # Different payload

class TestEmailParser:
    """Test email parsing"""
    
    def test_parse_simple_email(self):
        """Parse a simple inquiry email"""
        text = """
        Hi,
        
        My name is John Smith and I'm interested in buying a property at 123 Main Street.
        Please contact me at john@email.com or call 0412 345 678.
        
        Thanks,
        John
        """
        
        parsed = parser.parse_text(text)
        
        assert parsed.email == 'john@email.com'
        assert parsed.phone == '0412345678' or '0412345678' in (parsed.phone or '')
        assert parsed.interest == 'buying'
        assert parsed.confidence > 0.5
    
    def test_parse_selling_inquiry(self):
        """Parse a selling inquiry"""
        text = """
        Hello,
        
        I want to sell my house in Sydney. What's it worth?
        Can you do an appraisal?
        
        Contact: Sarah Johnson, sarah@example.com, 02 9876 5432
        """
        
        parsed = parser.parse_text(text)
        
        assert parsed.email == 'sarah@example.com'
        assert parsed.interest == 'selling'
    
    def test_parse_low_confidence(self):
        """Parse text with minimal info"""
        text = "Just looking for info"
        
        parsed = parser.parse_text(text)
        
        assert parsed.confidence < 0.5
        assert parsed.interest == 'general'

class TestFacebookIntegration:
    """Test Facebook Lead Ads integration"""
    
    def test_process_webhook(self):
        """Process Facebook webhook data"""
        webhook_data = {
            'entry': [{
                'changes': [{
                    'value': {
                        'leadgen_id': 'lead_123',
                        'form_id': 'form_456',
                        'ad_id': 'ad_789',
                        'page_id': 'page_111',
                        'created_time': 1700000000,
                        'field_data': [
                            {'name': 'full_name', 'values': ['Jane Doe']},
                            {'name': 'email', 'values': ['jane@example.com']},
                            {'name': 'phone_number', 'values': ['+61400111222']},
                            {'name': 'what_are_you_looking_for', 'values': ['Buying']}
                        ]
                    }
                }]
            }]
        }
        
        handler = FacebookLeadHandler()
        fb_lead = handler.process_lead(webhook_data)
        
        assert fb_lead.lead_id == 'lead_123'
        assert fb_lead.name == 'Jane Doe'
        assert fb_lead.email == 'jane@example.com'
    
    def test_to_clippy_format(self):
        """Convert Facebook lead to Clippy format"""
        handler = FacebookLeadHandler()
        fb_lead = handler.get_test_lead()
        
        clippy_lead = handler.to_clippy_lead(fb_lead, 'org_123')
        
        assert clippy_lead['org_id'] == 'org_123'
        assert clippy_lead['name'] == 'John Test'
        assert clippy_lead['source'] == 'facebook_lead_ad'
        assert clippy_lead['temperature'] == 'warm'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
