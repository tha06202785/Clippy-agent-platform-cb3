#!/usr/bin/env python3
"""
Automated Make.com Setup for Clippy
Runs automatically to configure all integrations
"""

import requests
import json
import time
import sys
from datetime import datetime

class AutomatedMakeComSetup:
    def __init__(self):
        self.config = {
            "api_token": "24b9675c-1306-4911-8961-4d8609b4ca66",
            "base_url": "https://us2.make.com/api/v2",
            "org_id": "7059064",
            "team_id": "4019235",
            "webhook_secret": "18f57bfe886502d81496a78b4b023b0d86746ea9253ccf1454f0912463e22a8a"
        }
        self.headers = {"Authorization": f"Token {self.config['api_token']}"}
        self.log_file = "/tmp/make_com_setup.log"
        
    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        with open(self.log_file, 'a') as f:
            f.write(log_entry + "\n")
    
    def test_connection(self):
        """Test API connection"""
        self.log("Testing Make.com API connection...")
        try:
            resp = requests.get(
                f"{self.config['base_url']}/users/me",
                headers=self.headers,
                timeout=10
            )
            if resp.status_code == 200:
                self.log("✅ API connection successful")
                return True
            else:
                self.log(f"❌ API connection failed: {resp.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Connection error: {e}")
            return False
    
    def create_scenario_blueprint(self, name, webhook_type):
        """Create scenario blueprint JSON"""
        # Webhook module as trigger
        webhook_module = {
            "name": "Webhook",
            "typeName": "webhook",
            "label": "Custom Webhook",
            "id": None,
            "type": 4,
            "webhook": {
                "name": name,
                "typeName": "webhook"
            }
        }
        
        # Supabase module for data storage
        supabase_module = {
            "name": "Supabase",
            "typeName": "supabase",
            "label": "Create a record",
            "id": None,
            "type": 4,
            "connection": "supabase-default"
        }
        
        return {
            "name": name,
            "description": f"Clippy {webhook_type} automation",
            "organizationId": int(self.config['org_id']),
            "teamId": int(self.config['team_id']),
            "isActive": True,
            "scenarioType": "standard",
            "blueprint": {
                "version": 1,
                "name": name,
                "description": f"Automated {webhook_type} handler",
                "modules": [webhook_module, supabase_module],
                "connections": []
            }
        }
    
    def create_scenario(self, name, webhook_type):
        """Create a scenario with retry logic"""
        self.log(f"Creating scenario: {name}")
        
        blueprint = self.create_scenario_blueprint(name, webhook_type)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                resp = requests.post(
                    f"{self.config['base_url']}/scenarios",
                    headers={**self.headers, "Content-Type": "application/json"},
                    json=blueprint,
                    timeout=15
                )
                
                self.log(f"  Attempt {attempt + 1}: Status {resp.status_code}")
                
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    self.log(f"  ✅ Created: {data.get('id')}")
                    return data
                elif resp.status_code == 400:
                    error = resp.json()
                    self.log(f"  ⚠️ Validation error: {error.get('message', 'Unknown')}")
                    # Try simplified version
                    return self.create_simple_scenario(name, webhook_type)
                else:
                    self.log(f"  ❌ Failed: {resp.text[:100]}")
                    
            except Exception as e:
                self.log(f"  ❌ Exception: {e}")
            
            time.sleep(2)
        
        return None
    
    def create_simple_scenario(self, name, webhook_type):
        """Create minimal scenario"""
        self.log(f"  Trying simplified creation for: {name}")
        try:
            # Minimal payload
            payload = {
                "name": name,
                "organizationId": int(self.config['org_id']),
                "teamId": int(self.config['team_id']),
                "isActive": True
            }
            
            resp = requests.post(
                f"{self.config['base_url']}/scenarios",
                headers={**self.headers, "Content-Type": "application/json"},
                json=payload,
                timeout=10
            )
            
            if resp.status_code in [200, 201]:
                return resp.json()
            else:
                self.log(f"  ❌ Simplified failed: {resp.text[:100]}")
                return None
        except Exception as e:
            self.log(f"  ❌ Error: {e}")
            return None
    
    def setup_webhook_handler(self, scenario_id, webhook_type):
        """Configure webhook handler"""
        self.log(f"Setting up webhook handler for {scenario_id}")
        
        webhook_config = {
            "scenario_id": scenario_id,
            "type": webhook_type,
            "url": f"https://hook.us2.make.com/{scenario_id}",
            "secret": self.config['webhook_secret'],
            "active": True
        }
        
        # Save webhook config
        with open(f'/tmp/webhook_{webhook_type}.json', 'w') as f:
            json.dump(webhook_config, f, indent=2)
        
        self.log(f"  💾 Webhook config saved")
        return webhook_config
    
    def run_setup(self):
        """Run complete automated setup"""
        self.log("=" * 60)
        self.log("AUTOMATED MAKE.COM SETUP STARTED")
        self.log("=" * 60)
        
        # Test connection
        if not self.test_connection():
            self.log("❌ Cannot proceed without API connection")
            return False
        
        # Scenarios to create
        scenarios_config = [
            {"name": "Clippy Lead Capture", "type": "lead"},
            {"name": "Clippy AI Reply", "type": "ai"},
            {"name": "Clippy Facebook Post", "type": "facebook"},
            {"name": "Clippy Daily Reminder", "type": "reminder"}
        ]
        
        created_scenarios = []
        
        for config in scenarios_config:
            scenario = self.create_scenario(config['name'], config['type'])
            if scenario:
                webhook = self.setup_webhook_handler(
                    scenario.get('id', 'unknown'),
                    config['type']
                )
                created_scenarios.append({
                    "scenario": scenario,
                    "webhook": webhook
                })
            time.sleep(1)
        
        # Save complete config
        final_config = {
            "api_config": self.config,
            "scenarios": created_scenarios,
            "setup_date": datetime.now().isoformat(),
            "status": "completed" if len(created_scenarios) == 4 else "partial"
        }
        
        with open('/tmp/make_com_complete_config.json', 'w') as f:
            json.dump(final_config, f, indent=2)
        
        self.log("\n" + "=" * 60)
        self.log(f"SETUP COMPLETE: {len(created_scenarios)}/4 scenarios created")
        self.log("=" * 60)
        
        if len(created_scenarios) < 4:
            self.log("⚠️ Some scenarios failed. Manual creation may be needed.")
            self.generate_manual_instructions()
        
        return len(created_scenarios) == 4
    
    def generate_manual_instructions(self):
        """Generate manual setup instructions"""
        instructions = """
MANUAL SETUP INSTRUCTIONS (Fallback):
=====================================

If automated setup failed, create scenarios manually:

1. Lead Capture Scenario:
   - Go to: https://us2.make.com/7059064
   - Create scenario: "Clippy Lead Capture"
   - Add trigger: Webhooks → Custom webhook
   - Name: "Lead Webhook"
   - Add action: Supabase → Create a record
   - Table: leads
   - Turn ON

2. AI Reply Scenario:
   - Create scenario: "Clippy AI Reply"
   - Trigger: Webhook
   - Action 1: OpenAI → Create completion
   - Action 2: Supabase → Update record
   - Turn ON

3. Facebook Post Scenario:
   - Create scenario: "Clippy Facebook Post"
   - Trigger: Schedule (daily 9 AM)
   - Action 1: HTTP → Get content from Clippy
   - Action 2: Facebook → Create post
   - Turn ON

4. Daily Reminder Scenario:
   - Create scenario: "Clippy Daily Reminder"
   - Trigger: Schedule (daily 8 AM)
   - Action: Email → Send reminder
   - Turn ON

After creating, copy webhook URLs to:
/root/.openclaw/workspace/Clippy-agent-platform-cb3-new/server/make_com_config.json
"""
        with open('/tmp/make_com_manual_instructions.txt', 'w') as f:
            f.write(instructions)
        self.log("📝 Manual instructions saved to /tmp/make_com_manual_instructions.txt")

if __name__ == "__main__":
    setup = AutomatedMakeComSetup()
    success = setup.run_setup()
    sys.exit(0 if success else 1)
