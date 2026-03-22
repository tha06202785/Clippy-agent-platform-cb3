# Clippy Agent Platform - Complete API Server
# CEO Agent: Building full backend with AI integration

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime, timedelta
import openai
from supabase import create_client

app = Flask(__name__)
CORS(app)

# Initialize clients
supabase = create_client(
    os.getenv("VITE_SUPABASE_URL"),
    os.getenv("VITE_SUPABASE_ANON_KEY")
)
openai.api_key = os.getenv("OPENAI_API_KEY")

# ============================================
# AUTH HELPER
# ============================================
def get_auth_user():
    """Get authenticated user from request."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    token = auth_header.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except:
        return None

# ============================================
# LEADS API
# ============================================

@app.route("/api/leads", methods=["GET"])
def get_leads():
    """Get all leads for org."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    org_id = request.args.get("org_id")
    status = request.args.get("status")
    
    query = supabase.table("leads").select("*, lead_events(count)").eq("org_id", org_id)
    
    if status:
        query = query.eq("status", status)
    
    result = query.order("created_at", desc=True).execute()
    return jsonify({"leads": result.data})

@app.route("/api/leads/<lead_id>", methods=["GET"])
def get_lead(lead_id):
    """Get single lead with full timeline."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    result = supabase.table("leads").select("""
        *,
        lead_events(*),
        conversations(*, messages(*)),
        linked_listing:listings(*)
    """).eq("id", lead_id).single().execute()
    
    return jsonify({"lead": result.data})

@app.route("/api/leads", methods=["POST"])
def create_lead():
    """Create new lead."""
    data = request.json
    
    # Create lead
    lead_result = supabase.table("leads").insert({
        **data,
        "status": "new",
        "temperature": "warm"
    }).execute()
    
    lead = lead_result.data[0]
    
    # Create event
    supabase.table("lead_events").insert({
        "org_id": data["org_id"],
        "lead_id": lead["id"],
        "event_type": "created",
        "payload_json": {"source": data.get("source", "api")}
    }).execute()
    
    # Create follow-up task
    supabase.table("tasks").insert({
        "org_id": data["org_id"],
        "lead_id": lead["id"],
        "type": "follow_up_2h",
        "title": "Follow up on new lead",
        "description": f"New lead: {data.get('full_name', 'Unknown')}",
        "due_at": (datetime.now() + timedelta(hours=2)).isoformat(),
        "status": "pending",
        "priority": "high"
    }).execute()
    
    return jsonify({"lead": lead}), 201

# ============================================
# WEBHOOK: Lead Capture (Public)
# ============================================

@app.route("/api/webhooks/lead-capture", methods=["POST"])
def webhook_lead_capture():
    """Public webhook for lead capture from Facebook, forms, etc."""
    data = request.json
    
    org_id = data.get("org_id")
    channel = data.get("channel", "website")
    email = data.get("email")
    phone = data.get("phone")
    full_name = data.get("full_name")
    message = data.get("message")
    listing_id = data.get("listing_id")
    
    # Check for existing lead
    existing = None
    if email:
        result = supabase.table("lead_identities").select("lead_id").eq("email", email).eq("org_id", org_id).execute()
        if result.data:
            existing = result.data[0]["lead_id"]
    
    if not existing and phone:
        result = supabase.table("lead_identities").select("lead_id").eq("phone", phone).eq("org_id", org_id).execute()
        if result.data:
            existing = result.data[0]["lead_id"]
    
    if existing:
        # Update existing lead
        lead_id = existing
        supabase.table("leads").update({
            "last_contact_at": datetime.now().isoformat()
        }).eq("id", lead_id).execute()
    else:
        # Create new lead
        lead_result = supabase.table("leads").insert({
            "org_id": org_id,
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "primary_channel": channel,
            "source": data.get("source", "webhook"),
            "linked_listing_id": listing_id
        }).execute()
        lead_id = lead_result.data[0]["id"]
        
        # Create identity
        supabase.table("lead_identities").insert({
            "org_id": org_id,
            "lead_id": lead_id,
            "channel": channel,
            "email": email,
            "phone": phone
        }).execute()
    
    # Create event
    supabase.table("lead_events").insert({
        "org_id": org_id,
        "lead_id": lead_id,
        "event_type": "message_received",
        "payload_json": {"message": message, "channel": channel}
    }).execute()
    
    # Create conversation and message
    conv_result = supabase.table("conversations").insert({
        "org_id": org_id,
        "lead_id": lead_id,
        "channel": channel,
        "status": "active",
        "last_message_preview": message[:100] if message else "",
        "last_message_at": datetime.now().isoformat()
    }).execute()
    conversation_id = conv_result.data[0]["id"]
    
    if message:
        supabase.table("messages").insert({
            "org_id": org_id,
            "conversation_id": conversation_id,
            "direction": "in",
            "text": message,
            "status": "read"
        }).execute()
    
    # Create urgent task to reply
    supabase.table("tasks").insert({
        "org_id": org_id,
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "type": "reply_now",
        "title": "Reply to new message",
        "description": message[:200] if message else "New inquiry",
        "due_at": (datetime.now() + timedelta(minutes=30)).isoformat(),
        "status": "pending",
        "priority": "urgent"
    }).execute()
    
    return jsonify({
        "success": True,
        "lead_id": lead_id,
        "conversation_id": conversation_id
    })

# ============================================
# AI: Draft Reply
# ============================================

@app.route("/api/ai/draft-reply", methods=["POST"])
def ai_draft_reply():
    """Generate AI draft reply for conversation."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    conversation_id = data.get("conversation_id")
    tone = data.get("tone", "professional")
    
    # Get conversation context
    conv_result = supabase.table("conversations").select("""
        *,
        leads(*),
        messages(*)
    """).eq("id", conversation_id).single().execute()
    
    conversation = conv_result.data
    lead = conversation["leads"]
    messages = conversation["messages"]
    
    # Build prompt for OpenAI
    message_history = "\n".join([
        f"{'Lead' if m['direction'] == 'in' else 'Agent'}: {m['text']}"
        for m in messages[-5:]  # Last 5 messages
    ])
    
    prompt = f"""You are a helpful real estate agent assistant. Draft a reply to the lead.

Lead: {lead.get('full_name', 'Unknown')}
Tone: {tone}

Conversation history:
{message_history}

Draft a warm, professional reply that:
1. Acknowledges their message
2. Asses relevant questions about their needs
3. Offers next steps (inspection, more info, etc.)
4. Ends with clear call to action

Keep it under 150 words."""
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a real estate agent assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        draft = response.choices[0].message.content
        
        # Save draft
        supabase.table("conversations").update({
            "ai_draft_reply": draft,
            "ai_draft_generated_at": datetime.now().isoformat()
        }).eq("id", conversation_id).execute()
        
        return jsonify({
            "draft": draft,
            "model": "gpt-4",
            "tokens_used": response.usage.total_tokens
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# AI: Content Pack Generator
# ============================================

@app.route("/api/ai/content-pack", methods=["POST"])
def generate_content_pack():
    """Generate marketing content pack for listing."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    listing_id = data.get("listing_id")
    pack_type = data.get("pack_type", "social")
    tone = data.get("tone", "professional")
    
    # Get listing details
    listing_result = supabase.table("listings").select("*").eq("id", listing_id).single().execute()
    listing = listing_result.data
    
    # Features formatting
    features = listing.get("features_json", {})
    features_text = ", ".join([k.replace("_", " ").title() for k, v in features.items() if v]) if features else ""
    
    prompt = f"""Create a marketing content pack for this property:

Address: {listing['address']}, {listing['suburb']}
Type: {listing['type']}
Price: {listing.get('price_display', 'Contact agent')}
Bedrooms: {listing.get('bedrooms', 'N/A')}
Bathrooms: {listing.get('bathrooms', 'N/A')}
Features: {features_text}

Generate in JSON format:
{{
  "caption_short": "30 words max for Instagram",
  "caption_long": "100 words for Facebook",
  "hashtags": ["5 relevant hashtags"],
  "cta": "Call to action",
  "whatsapp": "Friendly WhatsApp message",
  "email_subject": "Email subject line",
  "email_body": "2 paragraph email",
  "reel_script": {{
    "hook": "First 3 seconds",
    "beats": ["3 key selling points"],
    "close": "Call to action"
  }}
}}

Make it {tone} in tone and compelling."""
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a real estate marketing expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        
        # Parse JSON
        try:
            content_json = json.loads(content)
        except:
            content_json = {"raw": content}
        
        # Save to database
        result = supabase.table("content_packs").insert({
            "org_id": listing["org_id"],
            "listing_id": listing_id,
            "pack_type": pack_type,
            "tone": tone,
            "content_json": content_json,
            "status": "draft",
            "ai_model": "gpt-4",
            "tokens_used": response.usage.total_tokens
        }).execute()
        
        return jsonify({
            "content_pack": result.data[0],
            "generated": True
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# TASKS API
# ============================================

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """Get tasks for user."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    org_id = request.args.get("org_id")
    status = request.args.get("status", "pending")
    
    result = supabase.table("tasks").select("""
        *,
        leads(full_name),
        listings(address)
    """).eq("org_id", org_id).eq("status", status).order("due_at").execute()
    
    return jsonify({"tasks": result.data})

@app.route("/api/tasks/<task_id>/complete", methods=["PATCH"])
def complete_task(task_id):
    """Mark task as complete."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    supabase.table("tasks").update({
        "status": "completed",
        "completed_at": datetime.now().isoformat()
    }).eq("id", task_id).execute()
    
    return jsonify({"success": True})

# ============================================
# LISTINGS API
# ============================================

@app.route("/api/listings", methods=["GET"])
def get_listings():
    """Get all listings."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    org_id = request.args.get("org_id")
    status = request.args.get("status", "active")
    
    result = supabase.table("listings").select("*").eq("org_id", org_id).eq("status", status).order("created_at", desc=True).execute()
    return jsonify({"listings": result.data})

@app.route("/api/listings", methods=["POST"])
def create_listing():
    """Create new listing."""
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    
    result = supabase.table("listings").insert({
        **data,
        "status": "draft"
    }).execute()
    
    listing = result.data[0]
    
    # Create content generation task
    supabase.table("tasks").insert({
        "org_id": data["org_id"],
        "listing_id": listing["id"],
        "type": "generate_content_pack",
        "title": "Generate marketing content",
        "due_at": (datetime.now() + timedelta(hours=1)).isoformat(),
        "status": "pending",
        "priority": "medium"
    }).execute()
    
    return jsonify({"listing": listing}), 201

# ============================================
# HEALTH CHECK
# ============================================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
