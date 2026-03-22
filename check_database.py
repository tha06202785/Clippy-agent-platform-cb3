#!/usr/bin/env python3
"""
Check existing Supabase database structure
"""

import requests
import json

SUPABASE_URL = "https://mqydieqeybgxtjqogrwh.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE"

def check_tables():
    """Query database for existing tables."""
    
    # Query to list tables
    query = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
    """
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Try REST API approach
    try:
        # Check if we can access via REST
        # Try common endpoints
        tables = ['orgs', 'profiles', 'user_org_roles', 'listings', 'leads', 
                  'lead_events', 'conversations', 'messages', 'tasks', 
                  'content_packs', 'integrations']
        
        found_tables = []
        
        for table in tables:
            url = f"{SUPABASE_URL}/rest/v1/{table}?limit=1"
            response = requests.get(url, headers=headers, timeout=5)
            
            if response.status_code in [200, 401, 403]:  # 401/403 means table exists but auth issue
                found_tables.append(table)
                print(f"✅ {table}: EXISTS")
            elif response.status_code == 404:
                print(f"❌ {table}: NOT FOUND")
            else:
                print(f"⚠️  {table}: Status {response.status_code}")
        
        return found_tables
        
    except Exception as e:
        print(f"Error checking tables: {e}")
        return []

def check_auth():
    """Check if we can authenticate."""
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    
    # Try to get user info
    url = f"{SUPABASE_URL}/auth/v1/user"
    try:
        response = requests.get(url, headers=headers, timeout=5)
        print(f"\n🔐 Auth Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Authentication working")
        elif response.status_code == 401:
            print("⚠️  No user session (expected for anon key without login)")
        return response.status_code
    except Exception as e:
        print(f"❌ Auth error: {e}")
        return None

def main():
    print("=" * 60)
    print("🔍 CHECKING SUPABASE DATABASE")
    print("=" * 60)
    print(f"\nProject: {SUPABASE_URL}")
    
    # Check auth
    check_auth()
    
    # Check tables
    print("\n📊 CHECKING TABLES:")
    print("-" * 60)
    found = check_tables()
    
    print("\n" + "=" * 60)
    print("✅ DATABASE CHECK COMPLETE")
    print("=" * 60)
    
    if found:
        print(f"\n🎉 Found {len(found)} tables:")
        for t in found:
            print(f"   • {t}")
        print("\n✅ Database is ready!")
    else:
        print("\n⚠️  No tables found or auth issue")
        print("\n💡 To view your database:")
        print(f"   {SUPABASE_URL}/project/default")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
