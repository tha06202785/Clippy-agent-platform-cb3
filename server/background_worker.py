"""
Background Worker for Clippy
Processes leads, generates AI replies, and handles automation
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import threading
import schedule
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from integration_logs import logger, log_integration
from idempotency import checker, idempotent

class ClippyBackgroundWorker:
    """Background automation worker for Clippy"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.last_check = datetime.now() - timedelta(minutes=5)
        
    def start(self):
        """Start background worker"""
        if self.running:
            return
            
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        print(f"[{datetime.now()}] Background worker started")
        
    def stop(self):
        """Stop background worker"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print(f"[{datetime.now()}] Background worker stopped")
    
    def _run(self):
        """Main worker loop"""
        # Schedule tasks
        schedule.every(2).minutes.do(self.check_new_leads)
        schedule.every(5).minutes.do(self.generate_ai_replies)
        schedule.every(10).minutes.do(self.process_followups)
        schedule.every().day.at("08:30").do(self.send_daily_summary)
        
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(1)
            except Exception as e:
                print(f"[{datetime.now()}] Worker error: {e}")
                time.sleep(5)
    
    @log_integration('worker', 'check_leads')
    def check_new_leads(self):
        """Check for new leads and process them"""
        print(f"[{datetime.now()}] Checking for new leads...")
        # This would query Supabase for unprocessed leads
        # For now, placeholder - will integrate with actual DB
        pass
    
    @log_integration('worker', 'generate_replies')
    def generate_ai_replies(self):
        """Generate AI draft replies for unread messages"""
        print(f"[{datetime.now()}] Generating AI replies...")
        # This would check for messages needing replies
        # Generate AI drafts using OpenAI
        # Save to database for human approval
        pass
    
    @log_integration('worker', 'followups')
    def process_followups(self):
        """Process scheduled follow-up tasks"""
        print(f"[{datetime.now()}] Processing follow-ups...")
        # Check due tasks
        # Send reminders
        pass
    
    @log_integration('worker', 'daily_summary')
    def send_daily_summary(self):
        """Send daily summary to agents"""
        print(f"[{datetime.now()}] Sending daily summaries...")
        # Generate daily activity report
        # Send via email or in-app notification
        pass
    
    def process_webhook(self, webhook_data: Dict) -> bool:
        """Process incoming webhook (from Make.com or Facebook)"""
        try:
            # Check idempotency
            webhook_id = webhook_data.get('id', webhook_data.get('timestamp', ''))
            is_dup, _ = checker.check_or_execute(
                'webhook_process',
                {'webhook_id': webhook_id, 'data': webhook_data},
                webhook_data.get('org_id')
            )
            
            if is_dup:
                logger.log(
                    source='webhook',
                    event_type='duplicate_webhook',
                    status='skipped',
                    payload=webhook_data
                )
                return True
            
            # Process based on type
            event_type = webhook_data.get('event_type', 'unknown')
            
            if event_type == 'lead_capture':
                return self._process_lead_webhook(webhook_data)
            elif event_type == 'message_received':
                return self._process_message_webhook(webhook_data)
            elif event_type == 'facebook_lead':
                return self._process_facebook_lead(webhook_data)
            else:
                logger.log(
                    source='webhook',
                    event_type='unknown_type',
                    status='error',
                    payload=webhook_data,
                    error_message=f"Unknown event type: {event_type}"
                )
                return False
                
        except Exception as e:
            logger.log(
                source='webhook',
                event_type='process_error',
                status='error',
                payload=webhook_data,
                error_message=str(e)
            )
            return False
    
    def _process_lead_webhook(self, data: Dict) -> bool:
        """Process lead capture webhook"""
        # Validate lead data
        # Check for duplicates
        # Save to database
        # Trigger AI workflow
        logger.log(
            source='webhook',
            event_type='lead_capture',
            status='success',
            payload=data,
            org_id=data.get('org_id'),
            lead_id=data.get('lead_id')
        )
        return True
    
    def _process_message_webhook(self, data: Dict) -> bool:
        """Process message webhook"""
        # Save message
        # Update conversation
        # Trigger AI reply draft
        logger.log(
            source='webhook',
            event_type='message_received',
            status='success',
            payload=data,
            org_id=data.get('org_id'),
            lead_id=data.get('lead_id')
        )
        return True
    
    def _process_facebook_lead(self, data: Dict) -> bool:
        """Process Facebook lead ad webhook"""
        # Transform Facebook format to Clippy format
        # Check duplicates
        # Save to database
        logger.log(
            source='facebook',
            event_type='lead_ad',
            status='success',
            payload=data,
            org_id=data.get('org_id'),
            lead_id=data.get('lead_id')
        )
        return True

# Global worker instance
worker = ClippyBackgroundWorker()

# API endpoints for the worker
def get_worker_status() -> Dict:
    """Get current worker status"""
    return {
        'running': worker.running,
        'last_check': worker.last_check.isoformat() if worker.last_check else None,
        'uptime': 'Active' if worker.running else 'Stopped'
    }

def get_recent_logs(limit: int = 50) -> List[Dict]:
    """Get recent integration logs"""
    return logger.get_logs(limit=limit)

def get_errors(hours: int = 24) -> List[Dict]:
    """Get recent errors"""
    return logger.get_recent_errors(hours=hours)

# Start worker when module loads (if run directly)
if __name__ == '__main__':
    print("Starting Clippy Background Worker...")
    worker.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping worker...")
        worker.stop()
        print("Worker stopped.")
