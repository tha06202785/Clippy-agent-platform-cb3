"""
Integration Logs System for Clippy
Tracks all external API calls and webhook events
"""

import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
import sqlite3
import os

# Use SQLite for integration logs (lightweight, fast)
LOGS_DB_PATH = os.path.join(os.path.dirname(__file__), 'integration_logs.db')

class IntegrationLogger:
    """Logs all integration events for debugging and auditing"""
    
    def __init__(self):
        self.init_db()
    
    def init_db(self):
        """Create logs table if not exists"""
        conn = sqlite3.connect(LOGS_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS integration_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                source TEXT NOT NULL,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                payload TEXT,
                response TEXT,
                error_message TEXT,
                duration_ms INTEGER,
                org_id TEXT,
                lead_id TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for fast queries
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON integration_logs(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON integration_logs(source)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON integration_logs(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_org ON integration_logs(org_id)')
        
        conn.commit()
        conn.close()
    
    def log(self, 
            source: str,  # 'make.com', 'facebook', 'webhook', 'openai', etc.
            event_type: str,  # 'lead_received', 'message_sent', 'api_call', etc.
            status: str,  # 'success', 'error', 'pending', 'retry'
            payload: Optional[Dict] = None,
            response: Optional[Dict] = None,
            error_message: Optional[str] = None,
            duration_ms: Optional[int] = None,
            org_id: Optional[str] = None,
            lead_id: Optional[str] = None) -> str:
        """Log an integration event"""
        
        log_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        conn = sqlite3.connect(LOGS_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO integration_logs 
            (id, timestamp, source, event_type, status, payload, response, 
             error_message, duration_ms, org_id, lead_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            log_id,
            timestamp,
            source,
            event_type,
            status,
            json.dumps(payload) if payload else None,
            json.dumps(response) if response else None,
            error_message,
            duration_ms,
            org_id,
            lead_id
        ))
        
        conn.commit()
        conn.close()
        
        return log_id
    
    def get_logs(self, 
                 source: Optional[str] = None,
                 status: Optional[str] = None,
                 org_id: Optional[str] = None,
                 limit: int = 100) -> List[Dict]:
        """Query logs with filters"""
        
        conn = sqlite3.connect(LOGS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = 'SELECT * FROM integration_logs WHERE 1=1'
        params = []
        
        if source:
            query += ' AND source = ?'
            params.append(source)
        if status:
            query += ' AND status = ?'
            params.append(status)
        if org_id:
            query += ' AND org_id = ?'
            params.append(org_id)
        
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        logs = []
        for row in rows:
            log = dict(row)
            # Parse JSON fields
            if log.get('payload'):
                log['payload'] = json.loads(log['payload'])
            if log.get('response'):
                log['response'] = json.loads(log['response'])
            logs.append(log)
        
        conn.close()
        return logs
    
    def get_recent_errors(self, hours: int = 24) -> List[Dict]:
        """Get recent errors for monitoring"""
        conn = sqlite3.connect(LOGS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM integration_logs 
            WHERE status = 'error' 
            AND timestamp > datetime('now', '-{} hours')
            ORDER BY timestamp DESC
        '''.format(hours))
        
        rows = cursor.fetchall()
        logs = [dict(row) for row in rows]
        conn.close()
        return logs
    
    def update_status(self, log_id: str, status: str, 
                     response: Optional[Dict] = None,
                     error_message: Optional[str] = None):
        """Update log status (for retries)"""
        conn = sqlite3.connect(LOGS_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE integration_logs 
            SET status = ?, response = ?, error_message = ?
            WHERE id = ?
        ''', (status, json.dumps(response) if response else None, 
              error_message, log_id))
        
        conn.commit()
        conn.close()

# Global logger instance
logger = IntegrationLogger()

# Decorator for auto-logging
import functools
import time

def log_integration(source: str, event_type: str):
    """Decorator to auto-log function calls"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            log_id = None
            
            try:
                # Extract org_id and lead_id from kwargs if present
                org_id = kwargs.get('org_id')
                lead_id = kwargs.get('lead_id')
                
                # Log start
                log_id = logger.log(
                    source=source,
                    event_type=event_type,
                    status='pending',
                    payload={'args': str(args), 'kwargs': str(kwargs)},
                    org_id=org_id,
                    lead_id=lead_id
                )
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Log success
                duration = int((time.time() - start) * 1000)
                logger.update_status(
                    log_id, 
                    'success',
                    response={'result': str(result)[:1000]}  # Truncate long responses
                )
                
                return result
                
            except Exception as e:
                # Log error
                duration = int((time.time() - start) * 1000)
                if log_id:
                    logger.update_status(
                        log_id,
                        'error',
                        error_message=str(e)
                    )
                raise
        
        return wrapper
    return decorator
