#!/usr/bin/env python3
"""
CEO MODE: Create Make.com Scenarios via API
Fast execution - no excuses
"""

import requests
import json
import base64
import sys

# CONFIGURATION
MAKE_API_TOKEN = "24b9675c-1306-4911-8961-4d8609b4ca66"
MAKE_BASE_URL = "https://us2.make.com/api/v2"  # US2 region based on webhook URLs

# SCENARIO BLUEPRINTS (JSON format for Make.com)

# Facebook Lead Capture Scenario Blueprint
FACEBOOK_LEAD_BLUEPRINT = {
    "flow": [
        {
            "id": 1,
            "module": "facebook:Webhook",
            "version": 1,
            "parameters": {
                "hook": {
                    "url": "https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb",
                    "verifyToken": "clippy-webhook-verify"
                }
            }
        },
        {
            "id": 2,
            "module": "supabase:CreateRecord",
            "version": 1,
            "parameters": {
                "table": "leads",
                "data": {
                    "source": "{{1.source}}",
                    "full_name": "{{1.full_name}}",
                    "email": "{{1.email}}",
                    "phone": "{{1.phone}}",
                    "message": "{{1.message}}",
                    "external_id": "{{1.external_id}}",
                    "status": "new",
                    "temperature": "hot",
                    "platform": "facebook"
                }
            }
        },
        {
            "id": 3,
            "module": "slack:SendMessage",
            "version": 1,
            "parameters": {
                "channel": "#leads",
                "text": "🚨 New Facebook Lead: {{1.full_name}} - {{1.email}} - {{1.phone}}"
            },
            "enabled": False  # Optional notification
        }
    ]
}

# WhatsApp Lead Capture Scenario Blueprint  
WHATSAPP_BLUEPRINT = {
    "flow": [
        {
            "id": 1,
            "module": "whatsapp:Webhook",
            "version": 1,
            "parameters": {
                "phoneNumberId": "YOUR_WHATSAPP_PHONE_ID",
                "accessToken": "YOUR_WHATSAPP_TOKEN"
            }
        },
        {
            "id": 2,
            "module": "supabase:CreateRecord",
            "version": 1,
            "parameters": {
                "table": "conversations",
                "data": {
                    "channel": "whatsapp",
                    "lead_id": "{{2.id}}",
                    "status": "active"
                }
            }
        },
        {
            "id": 3,
            "module": "openai:CreateChatCompletion",
            "version": 1,
            "parameters": {
                "model": "gpt-4",
                "messages": [
                    {"role": "system", "content": "You are a real estate AI assistant. Draft a helpful reply."},
                    {"role": "user", "content": "{{1.message}}"}
                ]
            }
        },
        {
            "id": 4,
            "module": "supabase:UpdateRecord",
            "version": 1,
            "parameters": {
                "table": "conversations",
                "id": "{{2.id}}",
                "data": {
                    "ai_draft_reply": "{{3.choices[0].message.content}}"
                }
            }
        }
    ]
}

def get_headers():
    """Get API headers with authentication."""
    return {
        "Authorization": f"Token {MAKE_API_TOKEN}",
        "Content-Type": "application/json"
    }

def list_teams(org_id):
    """List available teams to get team ID."""
    try:
        response = requests.get(
            f"{MAKE_BASE_URL}/teams?organizationId={org_id}",
            headers=get_headers()
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to list teams: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def list_organizations():
    """List available organizations."""
    try:
        response = requests.get(
            f"{MAKE_BASE_URL}/organizations",
            headers=get_headers()
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Failed to list organizations: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def create_scenario(name, blueprint, team_id, scheduling=None):
    """Create a scenario via Make.com API."""
    
    if scheduling is None:
        scheduling = {"type": "instant"}  # Run instantly
    
    payload = {
        "name": name,
        "blueprint": json.dumps(blueprint),
        "teamId": team_id,
        "scheduling": json.dumps(scheduling)
    }
    
    try:
        response = requests.post(
            f"{MAKE_BASE_URL}/scenarios",
            headers=get_headers(),
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Scenario created: {name}")
            print(f"   ID: {data.get('scenario', {}).get('id')}")
            return data
        else:
            print(f"❌ Failed to create scenario: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error creating scenario: {e}")
        return None

def activate_scenario(scenario_id):
    """Activate a scenario."""
    try:
        response = requests.post(
            f"{MAKE_BASE_URL}/scenarios/{scenario_id}/start",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            print(f"✅ Scenario {scenario_id} activated")
            return True
        else:
            print(f"⚠️  Could not activate scenario: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error activating scenario: {e}")
        return False

def main():
    print("="*60)
    print("🚀 CEO MODE: Creating Make.com Scenarios")
    print("="*60)
    
    # Step 1: Get organization ID
    print("\n📋 Step 1: Getting organization information...")
    orgs = list_organizations()
    
    if not orgs or not orgs.get("organizations"):
        print("❌ Cannot proceed without organization")
        return manual_instructions()
    
    org_id = orgs["organizations"][0]["id"]
    org_name = orgs["organizations"][0]["name"]
    print(f"✅ Found organization: {org_name} (ID: {org_id})")
    
    # Step 2: Get team ID
    print("\n📋 Step 2: Getting team information...")
    teams = list_teams(org_id)
    
    if not teams or not teams.get("teams"):
        print("❌ Cannot proceed without team ID")
        return manual_instructions()
    
    team_id = teams["teams"][0]["id"]
    print(f"✅ Found team ID: {team_id}")
    
    # Step 3: Create Facebook Lead Capture scenario
    print("\n📋 Step 3: Creating Facebook Lead Capture scenario...")
    fb_scenario = create_scenario(
        name="Clippy - Facebook Lead Capture",
        blueprint=FACEBOOK_LEAD_BLUEPRINT,
        team_id=team_id
    )
    
    if fb_scenario:
        scenario_id = fb_scenario.get("scenario", {}).get("id")
        activate_scenario(scenario_id)
    
    # Step 4: Create WhatsApp scenario  
    print("\n📋 Step 4: Creating WhatsApp Lead Capture scenario...")
    wa_scenario = create_scenario(
        name="Clippy - WhatsApp AI Reply",
        blueprint=WHATSAPP_BLUEPRINT,
        team_id=team_id
    )
    
    if wa_scenario:
        scenario_id = wa_scenario.get("scenario", {}).get("id")
        activate_scenario(scenario_id)
    
    print("\n" + "="*60)
    print("✅ CEO MODE COMPLETE")
    print("="*60)
    
    if fb_scenario or wa_scenario:
        print("\n🎉 Scenarios created successfully!")
        print("\n📋 NEXT STEPS:")
        print("   1. Go to https://www.make.com/scenarios")
        print("   2. Check if scenarios are listed")
        print("   3. Open each scenario and configure connections:")
        print("      - Supabase: Add your connection")
        print("      - Facebook: Add Page Access Token")
        print("      - WhatsApp: Add Phone Number ID")
        print("   4. Turn ON each scenario")
    else:
        manual_instructions()
    
    return 0

def manual_instructions():
    """Print manual setup instructions."""
    print("\n⚠️  API approach failed")
    print("\n🔧 MANUAL SETUP REQUIRED:")
    print("\n   SCENARIO 1: Facebook Lead Capture")
    print("   ==================================")
    print("   1. Go to https://www.make.com/scenarios")
    print("   2. Click 'Create a new scenario'")
    print("   3. Search for 'Webhook' → Select 'Custom webhook'")
    print("   4. Click 'Add' → Copy this webhook URL:")
    print("      https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb")
    print("   5. Click 'Save' → Name it 'Clippy - Facebook Lead Capture'")
    print("   6. Add 'Supabase' module → Select 'Create a record'")
    print("   7. Configure Supabase:")
    print("      - Connection: Your Supabase connection")
    print("      - Table: leads")
    print("      - Map fields:")
    print("        * full_name ← from webhook")
    print("        * email ← from webhook") 
    print("        * phone ← from webhook")
    print("        * source ← 'facebook'")
    print("        * status ← 'new'")
    print("   8. Click 'Save'")
    print("   9. Toggle switch to ON (top right)")
    print("\n   SCENARIO 2: AI Reply Draft")
    print("   =========================")
    print("   1. Click 'Create a new scenario'")
    print("   2. Search for 'Supabase' → 'Watch records'")
    print("   3. Configure to watch 'messages' table")
    print("   4. Add 'OpenAI' → 'Create a chat completion'")
    print("   5. Configure:")
    print("      - Model: gpt-4")
    print("      - System: 'You are a real estate AI assistant'")
    print("      - User message: {{Supabase.text}}")
    print("   6. Add 'Supabase' → 'Update a record'")
    print("   7. Update conversation with ai_draft_reply")
    print("   8. Save and turn ON")
    print("\n   FACEBOOK WEBHOOK SETUP:")
    print("   ======================")
    print("   1. Go to https://developers.facebook.com/apps/972912268644898/webhooks/")
    print("   2. Click 'Add Subscription' → Select 'Page'")
    print("   3. Callback URL: https://hook.us2.make.com/tesmjmtuiireyrvdxmjjj6al94wxw8yb")
    print("   4. Verify Token: clippy-webhook-verify")
    print("   5. Check: messages, messaging_postbacks, feed")
    print("   6. Subscribe your page: Manpower-Australia")
    print("   7. Send test message to your page")
    print("   8. Check Clippy dashboard for lead!")

if __name__ == "__main__":
    sys.exit(main())
