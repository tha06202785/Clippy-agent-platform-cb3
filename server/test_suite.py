#!/usr/bin/env python3
"""
Clippy End-to-End Test Suite
Automated testing for all critical user flows
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple

class ClippyTester:
    """Automated E2E testing for Clippy platform"""
    
    def __init__(self, base_url: str = "https://useclippy-7z8jm3tcx-kenoltha-4584s-projects.vercel.app"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.results = []
        
    def log_test(self, name: str, status: str, message: str = ""):
        """Log test result"""
        result = {
            'name': name,
            'status': status,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{icon} {name}: {status} - {message}")
        return result
    
    def test_health_check(self) -> Dict:
        """Test basic connectivity"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                return self.log_test("Health Check", "PASS", "API responding")
            else:
                return self.log_test("Health Check", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            return self.log_test("Health Check", "FAIL", str(e))
    
    def test_supabase_connection(self) -> Dict:
        """Test database connectivity"""
        try:
            # Test Supabase connection via API
            response = requests.get(
                "https://mqydieqeybgxtjqogrwh.supabase.co/rest/v1/",
                headers={
                    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE",
                    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE"
                },
                timeout=10
            )
            if response.status_code == 200:
                return self.log_test("Supabase Connection", "PASS", "Database accessible")
            else:
                return self.log_test("Supabase Connection", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            return self.log_test("Supabase Connection", "FAIL", str(e))
    
    def test_openai_connection(self) -> Dict:
        """Test OpenAI API connectivity"""
        try:
            import os
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                return self.log_test("OpenAI Connection", "SKIP", "No API key configured")
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": "Hello"}],
                    "max_tokens": 5
                },
                timeout=15
            )
            
            if response.status_code == 200:
                return self.log_test("OpenAI Connection", "PASS", "AI service responding")
            else:
                return self.log_test("OpenAI Connection", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            return self.log_test("OpenAI Connection", "FAIL", str(e))
    
    def test_frontend_loading(self) -> Dict:
        """Test frontend loads correctly"""
        try:
            response = requests.get(self.base_url, timeout=15)
            if response.status_code == 200:
                content = response.text
                checks = {
                    'html_tag': '<html' in content.lower(),
                    'title': 'clippy' in content.lower() or 'real estate' in content.lower(),
                    'body': '<body' in content.lower(),
                    'scripts': '<script' in content.lower()
                }
                
                if all(checks.values()):
                    return self.log_test("Frontend Loading", "PASS", "All elements present")
                else:
                    missing = [k for k, v in checks.items() if not v]
                    return self.log_test("Frontend Loading", "WARN", f"Missing: {missing}")
            else:
                return self.log_test("Frontend Loading", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            return self.log_test("Frontend Loading", "FAIL", str(e))
    
    def test_api_endpoints(self) -> List[Dict]:
        """Test all API endpoints"""
        endpoints = [
            ("/api/health", "GET"),
            ("/api/leads", "GET"),
            ("/api/listing/generate-content", "POST"),
            ("/webhook/health", "GET")
        ]
        
        results = []
        for endpoint, method in endpoints:
            try:
                url = f"{self.base_url}{endpoint}"
                if method == "GET":
                    response = requests.get(url, timeout=10)
                else:
                    response = requests.post(url, json={}, timeout=10)
                
                if response.status_code in [200, 201, 204, 401, 403]:
                    results.append(self.log_test(f"API {endpoint}", "PASS", f"Status {response.status_code}"))
                else:
                    results.append(self.log_test(f"API {endpoint}", "FAIL", f"Status {response.status_code}"))
            except Exception as e:
                results.append(self.log_test(f"API {endpoint}", "FAIL", str(e)[:50]))
        
        return results
    
    def test_integration_logs(self) -> Dict:
        """Test integration logging system"""
        try:
            # Test if logs table exists by trying to write
            from integration_logs import logger
            
            test_log = logger.log(
                source='test',
                event_type='e2e_test',
                status='success',
                payload={'test': True}
            )
            
            if test_log:
                return self.log_test("Integration Logs", "PASS", "Logging system working")
            else:
                return self.log_test("Integration Logs", "FAIL", "Could not write log")
        except Exception as e:
            return self.log_test("Integration Logs", "FAIL", str(e)[:50])
    
    def test_idempotency(self) -> Dict:
        """Test idempotency system"""
        try:
            from idempotency import checker
            
            # Test duplicate detection
            payload = {'test': 'idempotency', 'timestamp': time.time()}
            
            # First check - should not be duplicate
            is_dup1, _ = checker.check_or_execute('test_op', payload)
            
            # Record success
            checker.record_success('test_op', payload, {'id': 'test123'})
            
            # Second check - should be duplicate
            is_dup2, _ = checker.check_or_execute('test_op', payload)
            
            if not is_dup1 and is_dup2:
                return self.log_test("Idempotency System", "PASS", "Duplicate detection working")
            else:
                return self.log_test("Idempotency System", "FAIL", "Detection not working correctly")
        except Exception as e:
            return self.log_test("Idempotency System", "FAIL", str(e)[:50])
    
    def run_all_tests(self) -> Dict:
        """Run complete test suite"""
        print("\n" + "="*60)
        print("CLIPPY END-TO-END TEST SUITE")
        print("="*60 + "\n")
        
        print("Testing infrastructure...")
        self.test_health_check()
        self.test_supabase_connection()
        self.test_openai_connection()
        
        print("\nTesting frontend...")
        self.test_frontend_loading()
        
        print("\nTesting API...")
        self.test_api_endpoints()
        
        print("\nTesting backend systems...")
        self.test_integration_logs()
        self.test_idempotency()
        
        return self.generate_report()
    
    def generate_report(self) -> Dict:
        """Generate test report"""
        passed = len([r for r in self.results if r['status'] == 'PASS'])
        failed = len([r for r in self.results if r['status'] == 'FAIL'])
        skipped = len([r for r in self.results if r['status'] == 'SKIP'])
        warnings = len([r for r in self.results if r['status'] == 'WARN'])
        
        total = len(self.results)
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'url': self.base_url,
            'summary': {
                'total': total,
                'passed': passed,
                'failed': failed,
                'skipped': skipped,
                'warnings': warnings,
                'pass_rate': f"{pass_rate:.1f}%"
            },
            'status': 'READY' if pass_rate >= 80 else 'NEEDS_WORK',
            'results': self.results
        }
        
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warnings}")
        print(f"⏭️  Skipped: {skipped}")
        print(f"\nPass Rate: {pass_rate:.1f}%")
        print(f"Status: {report['status']}")
        print("="*60)
        
        return report
    
    def save_report(self, filename: str = "/root/.openclaw/workspace/Clippy-agent-platform-cb3-new/test_report.json"):
        """Save report to file"""
        report = self.generate_report()
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\nReport saved to: {filename}")
        return report


# Run tests if executed directly
if __name__ == '__main__':
    tester = ClippyTester()
    tester.run_all_tests()
    tester.save_report()
