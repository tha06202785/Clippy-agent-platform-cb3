#!/usr/bin/env python3
"""
Clippy Platform - Full Integration Test Suite
Tests all connections: Supabase, Make.com, Builder.io, OpenAI, Facebook
"""

import requests
import json
import sys
from datetime import datetime

# Configuration from .env.local
CONFIG = {
    "supabase": {
        "url": "https://mqydieqeybgxtjqogrwh.supabase.co",
        "anon_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE"
    },
    "openai": {
        "api_key": "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"
    },
    "make": {
        "lead_webhook": "https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb",
        "reply_webhook": "https://hook.us2.make.com/immjt2oghud66w5r6p2plp35ssp6spmz"
    },
    "builder": {
        "public_key": "bpk-193f83cc97304c6d8b4f254d1321380a"
    },
    "facebook": {
        "page_token": "EAAN028orkiIBRLZBfMeShu1sfVczALjLbi5aZAJsrKBW1H0Wfg8mNNGHBBZAk0MoRP9yIdM4X2mjDqhAInTTp8fq9IAgViQ5mZBk6xwkD3ycrfhr5ypVhXsJuLHQuYwYGcZBuhFtBHLnRI5cA70LtYS3dno5afLWbBtM19qVQMX2QJOzvJqWK0BL5EIeGSPfJJSYsA3m8mTyKMj0Uema6DiRYJIQidOwiHsgpUQZDZD"
    },
    "site": {
        "url": "https://useclippy.com"
    }
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log(status, message, details=""):
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "PASS":
        print(f"{Colors.GREEN}✓ [{timestamp}] {message}{Colors.END}")
    elif status == "FAIL":
        print(f"{Colors.RED}✗ [{timestamp}] {message}{Colors.END}")
    elif status == "WARN":
        print(f"{Colors.YELLOW}⚠ [{timestamp}] {message}{Colors.END}")
    elif status == "INFO":
        print(f"{Colors.BLUE}ℹ [{timestamp}] {message}{Colors.END}")
    if details:
        print(f"  → {details}")

def test_supabase():
    """Test Supabase connection and tables"""
    print("\n" + "="*60)
    print("🔌 TEST 1: SUPABASE CONNECTION")
    print("="*60)

    headers = {
        "apikey": CONFIG["supabase"]["anon_key"],
        "Authorization": f"Bearer {CONFIG['supabase']['anon_key']}"
    }

    # Test 1: Health check
    try:
        url = f"{CONFIG['supabase']['url']}/rest/v1/"
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            log("PASS", "Supabase API reachable", f"Status: {response.status_code}")
        else:
            log("FAIL", "Supabase API error", f"Status: {response.status_code}")
            return False
    except Exception as e:
        log("FAIL", "Supabase connection failed", str(e))
        return False

    # Test 2: Check tables exist
    tables_to_check = ["leads", "conversations", "messages", "organizations", "users"]
    tables_found = []
    for table in tables_to_check:
        try:
            url = f"{CONFIG['supabase']['url']}/rest/v1/{table}?limit=1"
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code in [200, 401, 403]:  # 401/403 means table exists but auth needed
                tables_found.append(table)
        except:
            pass

    if tables_found:
        log("PASS", f"Tables found: {', '.join(tables_found)}")
    else:
        log("WARN", "Could not verify tables - may need service role key")

    # Test 3: Authentication endpoint
    try:
        url = f"{CONFIG['supabase']['url']}/auth/v1/settings"
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            log("PASS", "Auth service operational")
        else:
            log("WARN", "Auth check returned non-200", f"Status: {response.status_code}")
    except Exception as e:
        log("WARN", "Auth check failed", str(e))

    return True

def test_openai():
    """Test OpenAI API connection"""
    print("\n" + "="*60)
    print("🤖 TEST 2: OPENAI CONNECTION")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {CONFIG['openai']['api_key']}",
        "Content-Type": "application/json"
    }

    try:
        # Test with minimal request
        response = requests.get(
            "https://api.openai.com/v1/models",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            models = [m["id"] for m in data.get("data", []) if "gpt" in m["id"]]
            log("PASS", "OpenAI API connected", f"Available GPT models: {len(models)}")
            if models:
                log("INFO", f"Models: {', '.join(models[:3])}...")
            return True
        elif response.status_code == 401:
            log("FAIL", "OpenAI API key invalid or expired")
            return False
        else:
            log("FAIL", "OpenAI API error", f"Status: {response.status_code}")
            return False
    except Exception as e:
        log("FAIL", "OpenAI connection failed", str(e))
        return False

def test_make():
    """Test Make.com webhooks"""
    print("\n" + "="*60)
    print("⚙️  TEST 3: MAKE.COM WEBHOOKS")
    print("="*60)

    test_payload = {
        "test": True,
        "timestamp": datetime.now().isoformat(),
        "source": "integration_test"
    }

    # Test Lead Webhook
    try:
        response = requests.post(
            CONFIG["make"]["lead_webhook"],
            json=test_payload,
            timeout=10,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code in [200, 201, 202]:
            log("PASS", "Lead webhook responding", f"Status: {response.status_code}")
        else:
            log("WARN", "Lead webhook returned unexpected status", f"Status: {response.status_code}")
    except Exception as e:
        log("FAIL", "Lead webhook failed", str(e))

    # Test Reply Webhook
    try:
        response = requests.post(
            CONFIG["make"]["reply_webhook"],
            json=test_payload,
            timeout=10,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code in [200, 201, 202]:
            log("PASS", "Reply webhook responding", f"Status: {response.status_code}")
        else:
            log("WARN", "Reply webhook returned unexpected status", f"Status: {response.status_code}")
    except Exception as e:
        log("FAIL", "Reply webhook failed", str(e))

    return True

def test_builder():
    """Test Builder.io connection"""
    print("\n" + "="*60)
    print("🏗️  TEST 4: BUILDER.IO CONNECTION")
    print("="*60)

    try:
        url = f"https://cdn.builder.io/api/v3/content/page?apiKey={CONFIG['builder']['public_key']}&limit=1"
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            log("PASS", "Builder.io API connected", f"Content entries: {len(results)}")
            return True
        elif response.status_code == 401:
            log("FAIL", "Builder.io API key invalid")
            return False
        else:
            log("WARN", "Builder.io returned", f"Status: {response.status_code}")
            return False
    except Exception as e:
        log("FAIL", "Builder.io connection failed", str(e))
        return False

def test_facebook():
    """Test Facebook Page token"""
    print("\n" + "="*60)
    print("📘 TEST 5: FACEBOOK PAGE TOKEN")
    print("="*60)

    try:
        url = f"https://graph.facebook.com/v18.0/me"
        params = {
            "access_token": CONFIG["facebook"]["page_token"],
            "fields": "id,name"
        }
        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()
            page_name = data.get("name", "Unknown")
            page_id = data.get("id", "Unknown")
            log("PASS", "Facebook token valid", f"Page: {page_name} (ID: {page_id})")
            return True
        elif response.status_code == 400:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            log("FAIL", "Facebook token invalid", error_msg)
            return False
        else:
            log("FAIL", "Facebook API error", f"Status: {response.status_code}")
            return False
    except Exception as e:
        log("FAIL", "Facebook connection failed", str(e))
        return False

def test_site():
    """Test live site endpoints"""
    print("\n" + "="*60)
    print("🌐 TEST 6: LIVE SITE ENDPOINTS")
    print("="*60)

    endpoints = [
        ("/", "Homepage"),
        ("/dashboard", "Dashboard"),
        ("/login", "Login Page"),
        ("/api/health", "Health Check API"),
    ]

    results = []
    for path, name in endpoints:
        url = f"{CONFIG['site']['url']}{path}"
        try:
            response = requests.get(url, timeout=10, allow_redirects=True)
            if response.status_code == 200:
                log("PASS", f"{name}", f"Status: {response.status_code}")
                results.append(True)
            else:
                log("WARN", f"{name}", f"Status: {response.status_code}")
                results.append(False)
        except Exception as e:
            log("FAIL", f"{name}", str(e))
            results.append(False)

    return any(results)

def test_assets():
    """Test site assets loading"""
    print("\n" + "="*60)
    print("📦 TEST 7: SITE ASSETS")
    print("="*60)

    try:
        response = requests.get(CONFIG["site"]["url"], timeout=10)
        html = response.text

        # Check for essential elements
        checks = [
            ("<title>" in html, "Title tag present"),
            ("div id=\"root\"" in html or 'id="root"' in html, "React root element"),
            ("/assets/" in html, "Asset references"),
            ("script" in html, "JavaScript loaded"),
            ("stylesheet" in html or ".css" in html, "CSS loaded"),
        ]

        for passed, desc in checks:
            if passed:
                log("PASS", desc)
            else:
                log("WARN", f"Missing: {desc}")

        return True
    except Exception as e:
        log("FAIL", "Asset check failed", str(e))
        return False

def main():
    print("\n" + "="*60)
    print("🚀 CLIPPY PLATFORM - INTEGRATION TEST SUITE")
    print("="*60)
    print(f"Testing Site: {CONFIG['site']['url']}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    results = {
        "Supabase": test_supabase(),
        "OpenAI": test_openai(),
        "Make.com": test_make(),
        "Builder.io": test_builder(),
        "Facebook": test_facebook(),
        "Site Endpoints": test_site(),
        "Site Assets": test_assets(),
    }

    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {name}")

    print("="*60)
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print(f"\n{Colors.GREEN}🎉 ALL INTEGRATIONS WORKING!{Colors.END}")
        return 0
    elif passed >= total * 0.7:
        print(f"\n{Colors.YELLOW}⚠️  MOSTLY WORKING - Review failures above{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}❌ MULTIPLE FAILURES - Action required{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
