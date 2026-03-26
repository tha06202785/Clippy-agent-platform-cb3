"""
Idempotency System for Clippy
Prevents duplicate leads and duplicate operations
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import sqlite3
import os
import threading

# Thread-safe storage for idempotency keys
IDEMPOTENCY_DB_PATH = os.path.join(os.path.dirname(__file__), 'idempotency.db')
_lock = threading.Lock()

class IdempotencyChecker:
    """Prevents duplicate operations using idempotency keys"""
    
    def __init__(self):
        self.init_db()
        self._memory_cache = {}  # In-memory cache for speed
        self._cache_ttl = 300  # 5 minutes
    
    def init_db(self):
        """Create idempotency table"""
        conn = sqlite3.connect(IDEMPOTENCY_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS idempotency_keys (
                key TEXT PRIMARY KEY,
                operation_type TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                result_data TEXT,
                org_id TEXT
            )
        ''')
        
        # Index for cleanup
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_expires ON idempotency_keys(expires_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_operation ON idempotency_keys(operation_type)')
        
        conn.commit()
        conn.close()
    
    def generate_key(self, 
                    operation_type: str,
                    payload: Dict,
                    org_id: Optional[str] = None) -> str:
        """Generate a unique idempotency key"""
        # Create deterministic string from payload
        payload_str = json.dumps(payload, sort_keys=True, default=str)
        
        # Add org_id if provided
        if org_id:
            payload_str = f"{org_id}:{payload_str}"
        
        # Hash it
        return f"{operation_type}:{hashlib.sha256(payload_str.encode()).hexdigest()[:32]}"
    
    def check_or_execute(self,
                        operation_type: str,  # 'lead_create', 'message_send', etc.
                        payload: Dict,
                        org_id: Optional[str] = None,
                        ttl_hours: int = 24) -> tuple[bool, Optional[Any]]:
        """
        Check if operation was already performed.
        Returns: (is_duplicate, previous_result)
        """
        key = self.generate_key(operation_type, payload, org_id)
        
        with _lock:
            # Check memory cache first (fast)
            if key in self._memory_cache:
                cached = self._memory_cache[key]
                if datetime.utcnow() < cached['expires_at']:
                    return True, cached.get('result')
            
            # Check database
            conn = sqlite3.connect(IDEMPOTENCY_DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT result_data FROM idempotency_keys 
                WHERE key = ? AND expires_at > ?
            ''', (key, datetime.utcnow().isoformat()))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                result = json.loads(row[0]) if row[0] else None
                # Update memory cache
                self._memory_cache[key] = {
                    'expires_at': datetime.utcnow() + timedelta(seconds=self._cache_ttl),
                    'result': result
                }
                return True, result
            
            return False, None
    
    def record_success(self,
                      operation_type: str,
                      payload: Dict,
                      result: Any,
                      org_id: Optional[str] = None,
                      ttl_hours: int = 24):
        """Record successful operation for idempotency"""
        key = self.generate_key(operation_type, payload, org_id)
        
        created_at = datetime.utcnow().isoformat()
        expires_at = (datetime.utcnow() + timedelta(hours=ttl_hours)).isoformat()
        
        with _lock:
            # Save to database
            conn = sqlite3.connect(IDEMPOTENCY_DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO idempotency_keys 
                (key, operation_type, created_at, expires_at, result_data, org_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                key,
                operation_type,
                created_at,
                expires_at,
                json.dumps(result, default=str) if result else None,
                org_id
            ))
            
            conn.commit()
            conn.close()
            
            # Update memory cache
            self._memory_cache[key] = {
                'expires_at': datetime.utcnow() + timedelta(seconds=self._cache_ttl),
                'result': result
            }
    
    def cleanup_expired(self, days: int = 7):
        """Clean up old idempotency keys"""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        conn = sqlite3.connect(IDEMPOTENCY_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM idempotency_keys WHERE expires_at < ?', (cutoff,))
        deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        # Clean memory cache too
        now = datetime.utcnow()
        expired_keys = [k for k, v in self._memory_cache.items() 
                       if v['expires_at'] < now]
        for k in expired_keys:
            del self._memory_cache[k]
        
        return deleted
    
    def is_duplicate_lead(self, 
                         email: Optional[str],
                         phone: Optional[str],
                         name: str,
                         org_id: str,
                         within_minutes: int = 5) -> bool:
        """Check if a similar lead was created recently"""
        if not email and not phone:
            return False
        
        conn = sqlite3.connect(IDEMPOTENCY_DB_PATH)
        cursor = conn.cursor()
        
        cutoff = (datetime.utcnow() - timedelta(minutes=within_minutes)).isoformat()
        
        # Check by email or phone
        cursor.execute('''
            SELECT key FROM idempotency_keys 
            WHERE operation_type = 'lead_create'
            AND org_id = ?
            AND created_at > ?
            AND result_data LIKE ?
        ''', (org_id, cutoff, f'%{email or ""}%'))
        
        if cursor.fetchone():
            conn.close()
            return True
        
        if phone:
            cursor.execute('''
                SELECT key FROM idempotency_keys 
                WHERE operation_type = 'lead_create'
                AND org_id = ?
                AND created_at > ?
                AND result_data LIKE ?
            ''', (org_id, cutoff, f'%{phone}%'))
            
            if cursor.fetchone():
                conn.close()
                return True
        
        conn.close()
        return False

# Global instance
checker = IdempotencyChecker()

# Decorator for idempotent operations
def idempotent(operation_type: str, ttl_hours: int = 24):
    """Decorator to make a function idempotent"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Extract payload from args/kwargs
            payload = kwargs.get('payload') or (args[0] if args else {})
            org_id = kwargs.get('org_id')
            
            # Check if already processed
            is_dup, result = checker.check_or_execute(
                operation_type, payload, org_id, ttl_hours
            )
            
            if is_dup:
                return result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Record success
            checker.record_success(operation_type, payload, result, org_id, ttl_hours)
            
            return result
        return wrapper
    return decorator
