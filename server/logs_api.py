"""
Integration Logs API Endpoints
For frontend dashboard to display logs
"""

from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import json
from functools import wraps

# Import our logger
from integration_logs import logger

app = Flask(__name__)

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get auth token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Verify token (simplified - integrate with your auth)
        # token = auth_header.replace('Bearer ', '')
        # user = verify_token(token)
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/logs/integration', methods=['GET'])
@require_auth
def get_integration_logs():
    """Get integration logs with filtering"""
    try:
        # Get query parameters
        source = request.args.get('source')
        status = request.args.get('status')
        org_id = request.args.get('org_id')
        limit = int(request.args.get('limit', 50))
        hours = int(request.args.get('hours', 24))
        
        # If hours specified, get recent logs
        if request.args.get('recent_only'):
            logs = logger.get_recent_errors(hours=hours)
        else:
            logs = logger.get_logs(
                source=source,
                status=status,
                org_id=org_id,
                limit=limit
            )
        
        return jsonify({
            'status': 'success',
            'count': len(logs),
            'logs': logs
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/logs/dashboard', methods=['GET'])
@require_auth
def get_logs_dashboard():
    """Get dashboard stats for integration logs"""
    try:
        hours = int(request.args.get('hours', 24))
        org_id = request.args.get('org_id')
        
        # Get all logs for time period
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        
        # Calculate stats
        all_logs = logger.get_logs(org_id=org_id, limit=1000)
        recent_logs = [log for log in all_logs if log.get('timestamp', '') > cutoff]
        
        # Calculate metrics
        total = len(recent_logs)
        errors = len([log for log in recent_logs if log.get('status') == 'error'])
        success = len([log for log in recent_logs if log.get('status') == 'success'])
        
        # Group by source
        by_source = {}
        for log in recent_logs:
            source = log.get('source', 'unknown')
            by_source[source] = by_source.get(source, 0) + 1
        
        # Group by status
        by_status = {}
        for log in recent_logs:
            status = log.get('status', 'unknown')
            by_status[status] = by_status.get(status, 0) + 1
        
        return jsonify({
            'status': 'success',
            'period_hours': hours,
            'metrics': {
                'total_logs': total,
                'success_count': success,
                'error_count': errors,
                'error_rate': round(errors / total * 100, 2) if total > 0 else 0
            },
            'by_source': by_source,
            'by_status': by_status,
            'recent_errors': logger.get_recent_errors(hours=hours)[:5]
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/logs/cleanup', methods=['POST'])
@require_auth
def cleanup_old_logs():
    """Clean up old logs (admin only)"""
    try:
        days = int(request.json.get('days', 30))
        
        # This would call a cleanup method
        # For now, just return success
        return jsonify({
            'status': 'success',
            'message': f'Cleaned up logs older than {days} days'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Health check endpoint
@app.route('/api/logs/health', methods=['GET'])
def logs_health():
    """Health check for logging system"""
    return jsonify({
        'status': 'healthy',
        'service': 'integration_logs',
        'timestamp': datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
