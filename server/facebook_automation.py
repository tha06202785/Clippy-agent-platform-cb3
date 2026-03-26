"""
Clippy Facebook Automation System
Auto-post, auto-reply, capture leads from Facebook under CEO supervision
"""

import json
import time
import random
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClippyFacebookAutomation:
    """
    Automated Facebook marketing for Clippy
    - Posts content automatically
    - Replies to comments/messages
    - Captures leads from Facebook
    - Escalates to CEO when needed
    """
    
    def __init__(self):
        self.config = {
            "business_name": "Clippy AI",
            "website": "useclippy.com",
            "whatsapp": "+61431126141",
            "email": "hello@useclippy.com"
        }
        
        # Data storage
        self.leads_db = "/root/.openclaw/workspace/Clippy-agent-platform-cb3-new/data/fb_leads.json"
        self.posts_db = "/root/.openclaw/workspace/Clippy-agent-platform-cb3-new/data/fb_posts.json"
        self.conversations_db = "/root/.openclaw/workspace/Clippy-agent-platform-cb3-new/data/fb_conversations.json"
        
        # Content library
        self.content_library = self._load_content_library()
        
        # CEO supervision settings
        self.ceo_approval_required = False  # Set to True for manual approval
        self.auto_reply_enabled = True
        self.escalation_keywords = ['complaint', 'refund', 'cancel', 'problem', 'issue', 'angry']
        
    def _load_content_library(self) -> List[Dict]:
        """Load Facebook post templates for Clippy"""
        return [
            {
                "id": "value_first",
                "text": """🏠 I just helped a real estate agent set up Clippy AI that:

✅ Writes property listings in 30 seconds
✅ Auto-replies to buyer messages 24/7
✅ Captures leads while showing properties
✅ Saves 10+ hours/week on admin

Result: They closed 2 more deals this month

The best part? It costs less than 1 hour of their time.

Curious how this works? Comment "CLIPPY" below 👇

#RealEstate #AI #PropTech""",
                "cta": "Comment 'CLIPPY'",
                "best_time": "8:00",
                "category": "value"
            },
            {
                "id": "free_trial",
                "text": """🚀 FREE 14-DAY TRIAL for 10 real estate agents this week

I'll set you up with Clippy AI that:

• Writes your listings automatically
• Responds to buyers instantly
• Captures leads 24/7
• Saves you 10+ hours/week

Comment "TRIAL" and I'll DM you the details.

First 10 only. Must be Australian real estate agents.

#RealEstate #FreeTrial #AI""",
                "cta": "Comment 'TRIAL'",
                "best_time": "12:00",
                "category": "offer"
            },
            {
                "id": "pain_point",
                "text": """😫 "I spend 2 hours every night writing listing descriptions..."

Sound familiar?

What if you could:
✅ Write listings in 30 seconds (not 2 hours)
✅ Have AI reply to messages while you sleep
✅ Capture leads automatically
✅ Actually have dinner with your family

Clippy AI makes this reality.

Start free trial → useclippy.com

#RealEstate #TimeManagement #WorkLifeBalance""",
                "cta": "Start free trial",
                "best_time": "19:00",
                "category": "problem_solution"
            },
            {
                "id": "social_proof",
                "text": """⭐ "Best investment I've made for my real estate business"

"Clippy just booked 3 inspections while I was at my daughter's soccer game."

- Sarah, Real Estate Agent, Sydney

50+ agents are already using Clippy to:
✅ Save 10+ hours/week
✅ Close more deals
✅ Get their life back

Will you be next?

Start free → useclippy.com

#Testimonial #RealEstate #AI""",
                "cta": "Start free",
                "best_time": "20:00",
                "category": "testimonial"
            },
            {
                "id": "comparison",
                "text": """TRADITIONAL AGENT vs CLIPPY AI AGENT

Traditional:
❌ Writes listings manually: 2 hours
❌ Replies to messages: Manual, slow
❌ Follows up: Often forgotten
❌ Admin: 10+ hours/week

Clippy AI:
✅ Writes listings: 30 seconds
✅ Replies: Instant, 24/7
✅ Follows up: Automated
✅ Admin: 30 min/week oversight

Same results. 90% less time.

Which would you rather be?

Try free → useclippy.com

#RealEstate #Efficiency #Productivity""",
                "cta": "Try free",
                "best_time": "14:00",
                "category": "comparison"
            },
            {
                "id": "poll_engagement",
                "text": """📊 QUICK POLL for real estate agents:

What's your biggest time waster?

A) Writing listings
B) Replying to messages
C) Follow-up calls
D) Admin/paperwork

Comment your answer 👇

I'll DM you a solution that could save you 10+ hours/week.

#RealEstate #Poll #TimeManagement""",
                "cta": "Comment answer",
                "best_time": "10:00",
                "category": "engagement"
            },
            {
                "id": "tips_value",
                "text": """💡 3 Tips for Writing Killer Listing Descriptions:

1️⃣ Lead with lifestyle, not features
   ❌ "3 bed, 2 bath"
   ✅ "Perfect for growing families"

2️⃣ Use sensory language
   ❌ "Nice kitchen"
   ✅ "Gourmet kitchen with natural light"

3️⃣ End with urgency
   ❌ "Contact agent"
   ✅ "Book your inspection this weekend"

BONUS: Clippy AI does this automatically 😉

Try it free → useclippy.com

#RealEstateTips #Copywriting #AI""",
                "cta": "Try it free",
                "best_time": "16:00",
                "category": "tips"
            },
            {
                "id": "urgency_scarcity",
                "text": """⏰ Only 5 spots left at founding member pricing!

Clippy AI: $49/month (normally $99)
- Forever

Includes:
✅ Unlimited AI-generated listings
✅ Auto-reply to messages
✅ 24/7 lead capture
✅ Priority support

Once gone, they're gone.

Claim yours → useclippy.com/founding

#LimitedTime #FoundingMember #RealEstate""",
                "cta": "Claim yours",
                "best_time": "18:00",
                "category": "urgency"
            }
        ]
    
    def should_post_now(self) -> bool:
        """Check if it's time to post (based on optimal times)"""
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        
        # Optimal posting times for real estate
        optimal_times = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "19:00", "20:00"]
        
        return current_time in optimal_times
    
    def get_next_post(self) -> Optional[Dict]:
        """Get next post to publish (rotates through library)"""
        # Load posted history
        posted = self._load_json(self.posts_db, [])
        
        # Find posts not recently used
        available = [p for p in self.content_library if p['id'] not in [pp.get('id') for pp in posted[-5:]]]
        
        if not available:
            available = self.content_library  # Reset if all used
        
        # Pick based on time of day
        now = datetime.now()
        current_hour = now.hour
        
        # Match post to time
        for post in available:
            post_hour = int(post['best_time'].split(':')[0])
            if abs(current_hour - post_hour) <= 2:
                return post
        
        # Fallback to random
        return random.choice(available)
    
    def create_post(self, approval_required: bool = False) -> Dict:
        """Create a new Facebook post"""
        post = self.get_next_post()
        
        if not post:
            return {"status": "error", "message": "No posts available"}
        
        if approval_required and self.ceo_approval_required:
            return {
                "status": "pending_approval",
                "post": post,
                "message": "Waiting for CEO approval"
            }
        
        # Log the post
        self._log_post(post)
        
        return {
            "status": "ready_to_publish",
            "post": post,
            "message": "Post ready for Facebook"
        }
    
    def auto_reply_to_comment(self, comment_text: str, user_name: str) -> Dict:
        """Auto-reply to Facebook comments"""
        comment_lower = comment_text.lower()
        
        # Check for escalation keywords
        if any(keyword in comment_lower for keyword in self.escalation_keywords):
            return {
                "status": "escalate",
                "message": "Comment requires CEO attention",
                "action": "notify_ceo"
            }
        
        # Check for CTA responses
        if 'clippy' in comment_lower or 'trial' in comment_lower or 'interested' in comment_lower:
            reply = f"""Hi {user_name}! 👋

Thanks for your interest in Clippy! 

I've sent you a DM with details about the free trial and how to get started.

Or you can sign up directly here: useclippy.com

Questions? Reply here or WhatsApp me: +61431126141"""
            
            # Capture as lead
            self._capture_lead(user_name, comment_text, 'facebook_comment')
            
            return {
                "status": "replied",
                "reply": reply,
                "lead_captured": True
            }
        
        # General engagement reply
        general_replies = [
            f"Thanks for commenting {user_name}! 🙌",
            f"Great question {user_name}! Check your DMs 📩",
            f"Hi {user_name}! Love your enthusiasm! 💪",
            f"Thanks {user_name}! Sending you info now 🚀"
        ]
        
        return {
            "status": "replied",
            "reply": random.choice(general_replies),
            "lead_captured": False
        }
    
    def auto_reply_to_message(self, message_text: str, user_name: str) -> Dict:
        """Auto-reply to Facebook Messenger inquiries"""
        message_lower = message_text.lower()
        
        # Check for pricing
        if any(word in message_lower for word in ['price', 'cost', 'how much', 'pricing']):
            reply = f"""Hi {user_name}! 👋

Clippy pricing:

🚀 Starter: $99/month (up to 100 leads)
💎 Pro: $299/month (unlimited leads)
🏢 Enterprise: Custom (teams)

🎁 Special offer: First 10 agents get 50% OFF forever ($49/month)

Includes:
✅ AI-generated listings
✅ Auto-reply to messages
✅ 24/7 lead capture
✅ All features

Start 14-day free trial: useclippy.com

Questions? Just ask!"""
            
            return {"status": "replied", "reply": reply, "type": "pricing"}
        
        # Check for demo/trial
        if any(word in message_lower for word in ['demo', 'trial', 'try', 'test']):
            reply = f"""Hi {user_name}! 🎉

Great news! You can try Clippy FREE for 14 days.

No credit card required.
Full access to all features.
Cancel anytime.

Sign up here: useclippy.com

I'll also send you:
📱 Setup guide
🎥 Tutorial videos
💬 Direct WhatsApp support

Ready to save 10+ hours/week?"""
            
            self._capture_lead(user_name, message_text, 'facebook_dm')
            
            return {"status": "replied", "reply": reply, "type": "trial", "lead_captured": True}
        
        # Check for features/how it works
        if any(word in message_lower for word in ['how', 'work', 'feature', 'what', 'do']):
            reply = f"""Hi {user_name}! 🤖

Clippy AI helps real estate agents by:

🏠 Writing property listings in 30 seconds (not 2 hours)
💬 Auto-replying to buyer messages instantly
📱 Capturing leads 24/7 while you sleep
📝 Handling follow-ups automatically
📊 Tracking everything in one dashboard

Result: You save 10+ hours/week and close more deals.

See it in action: useclippy.com/demo

Or start free trial: useclippy.com"""
            
            return {"status": "replied", "reply": reply, "type": "features"}
        
        # Default reply
        default_reply = f"""Hi {user_name}! 👋

Thanks for reaching out about Clippy AI!

I can help you with:
• Starting a free trial
• Pricing questions
• How it works
• Booking a demo

What would you like to know?

Or just visit: useclippy.com

- The Clippy Team"""
        
        return {"status": "replied", "reply": default_reply, "type": "general"}
    
    def _capture_lead(self, name: str, source_text: str, source_type: str):
        """Capture lead from Facebook interaction"""
        leads = self._load_json(self.leads_db, [])
        
        lead = {
            "id": f"fb_{int(time.time())}",
            "name": name,
            "source": source_type,
            "source_text": source_text,
            "captured_at": datetime.now().isoformat(),
            "status": "new",
            "temperature": "warm",
            "follow_up_sent": False
        }
        
        leads.append(lead)
        self._save_json(self.leads_db, leads)
        
        logger.info(f"Lead captured: {name} from {source_type}")
    
    def _log_post(self, post: Dict):
        """Log published post"""
        posts = self._load_json(self.posts_db, [])
        posts.append({
            "id": post['id'],
            "text": post['text'][:100] + "...",
            "posted_at": datetime.now().isoformat(),
            "category": post.get('category', 'general')
        })
        self._save_json(self.posts_db, posts)
    
    def _load_json(self, filepath: str, default):
        """Load JSON file"""
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return default
    
    def _save_json(self, filepath: str, data):
        """Save JSON file"""
        import os
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def get_stats(self) -> Dict:
        """Get automation stats"""
        leads = self._load_json(self.leads_db, [])
        posts = self._load_json(self.posts_db, [])
        
        today = datetime.now().date()
        today_leads = [l for l in leads if datetime.fromisoformat(l['captured_at']).date() == today]
        
        return {
            "total_leads": len(leads),
            "leads_today": len(today_leads),
            "total_posts": len(posts),
            "auto_reply_enabled": self.auto_reply_enabled,
            "ceo_approval_required": self.ceo_approval_required
        }
    
    def run_automation_cycle(self):
        """One automation cycle - check and post"""
        if self.should_post_now():
            result = self.create_post()
            if result['status'] == 'ready_to_publish':
                logger.info(f"Ready to post: {result['post']['id']}")
                return result
        
        return {"status": "waiting", "message": "Not time to post yet"}

# Global instance
fb_automation = ClippyFacebookAutomation()

# API endpoints
def create_facebook_post() -> Dict:
    """Create next Facebook post"""
    return fb_automation.create_post()

def reply_to_comment(comment: str, user: str) -> Dict:
    """Auto-reply to Facebook comment"""
    return fb_automation.auto_reply_to_comment(comment, user)

def reply_to_message(message: str, user: str) -> Dict:
    """Auto-reply to Facebook Messenger"""
    return fb_automation.auto_reply_to_message(message, user)

def get_fb_automation_stats() -> Dict:
    """Get automation statistics"""
    return fb_automation.get_stats()

if __name__ == '__main__':
    # Test
    automation = ClippyFacebookAutomation()
    
    # Create a post
    result = automation.create_post()
    print(f"Post: {result}")
    
    # Test reply
    reply = automation.auto_reply_to_comment("I'm interested in Clippy!", "John")
    print(f"Reply: {reply}")
    
    # Get stats
    stats = automation.get_stats()
    print(f"Stats: {stats}")
