#!/usr/bin/env python3
"""
SUPABASE DATABASE EXPLORER for Clippy Agent Platform
Connects to Supabase to view tables and schema
"""

import json
import asyncio
from datetime import datetime

def parse_connection_string(conn_string):
    """Parse Supabase connection details."""
    # Format: URL,PUBLISHABLE_KEY,ANON_KEY
    parts = conn_string.split(',')
    
    return {
        "url": parts[0].strip(),
        "project_ref": parts[0].strip().split('//')[1].split('.')[0],
        "anon_key": parts[2].strip() if len(parts) > 2 else parts[1].strip()
    }

def generate_sql_inspection():
    """Generate SQL queries to inspect database."""
    
    queries = {
        "list_tables": """
-- List all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
        """,
        
        "table_structure": """
-- Get structure of specific table (replace TABLE_NAME)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'TABLE_NAME'
ORDER BY ordinal_position;
        """,
        
        "check_rls": """
-- Check Row Level Security policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
        """,
        
        "count_records": """
-- Count records in all tables
SELECT 
    'orgs' as table_name, COUNT(*) as count FROM orgs
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'listings', COUNT(*) FROM listings
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'content_packs', COUNT(*) FROM content_packs
UNION ALL
SELECT 'integrations', COUNT(*) FROM integrations;
        """
    }
    
    return queries

def main():
    # Connection string from user
    conn_string = "https://mqydieqeybgxtjqogrwh.supabase.co,sb_publishable_fgi9j879wWGlzEQbt0i7Yw_D7rYZG3g,eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE"
    
    creds = parse_connection_string(conn_string)
    
    print("=" * 60)
    print("🔐 SUPABASE CONNECTION DETAILS")
    print("=" * 60)
    print(f"\nProject URL: {creds['url']}")
    print(f"Project Ref: {creds['project_ref']}")
    print(f"\n✅ Connection configured!")
    
    print("\n" + "=" * 60)
    print("📊 SQL INSPECTION QUERIES")
    print("=" * 60)
    
    queries = generate_sql_inspection()
    
    for name, sql in queries.items():
        print(f"\n🔍 {name.upper()}:")
        print(f"{sql}")
        print("-" * 60)
    
    print("\n" + "=" * 60)
    print("🔗 SUPABASE DASHBOARD URL")
    print("=" * 60)
    print(f"\n{creds['url']}/project/default")
    print("\nLogin with your Supabase account to view tables")
    print("=" * 60)
    
    # Save connection to env file
    with open('/root/.openclaw/workspace/Clippy-agent-platform-cb3-new/.env.local', 'w') as f:
        f.write(f"VITE_SUPABASE_URL={creds['url']}\n")
        f.write(f"VITE_SUPABASE_ANON_KEY={creds['anon_key']}\n")
    
    print("\n✅ Saved to: .env.local")

if __name__ == "__main__":
    main()
