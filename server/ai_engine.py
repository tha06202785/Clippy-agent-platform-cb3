#!/usr/bin/env python3
"""
CLIPPY AI ENGINE
OpenAI Integration for Real Estate Automation
"""

import openai
import json
from typing import Dict, List, Optional
from datetime import datetime

class ClippyAIEngine:
    """AI engine for content generation, replies, and analysis."""
    
    def __init__(self, api_key: str):
        openai.api_key = api_key
        self.model = "gpt-4"
        
    async def draft_reply(self, 
                         conversation_history: List[Dict],
                         lead_info: Dict,
                         tone: str = "professional") -> Dict:
        """Generate AI draft reply to lead."""
        
        messages_text = "\n".join([
            f"{'Lead' if m['direction'] == 'in' else 'Agent'}: {m['text']}"
            for m in conversation_history[-5:]
        ])
        
        prompt = f"""You are a professional real estate agent assistant.

Lead Info:
- Name: {lead_info.get('full_name', 'Unknown')}
- Status: {lead_info.get('status', 'new')}
- Budget: ${lead_info.get('budget_max', 'unknown')}

Conversation:
{messages_text}

Draft a {tone} reply that:
1. Acknowledges their message warmly
2. Asses relevant questions about their needs
3. Offers next steps (inspection, info, etc.)
4. Ends with clear call-to-action

Keep under 150 words. Be authentic and helpful."""
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a real estate agent assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return {
                "draft": response.choices[0].message.content,
                "model": self.model,
                "tokens_used": response.usage.total_tokens,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def generate_content_pack(self,
                                   listing: Dict,
                                   pack_type: str = "social",
                                   tone: str = "professional") -> Dict:
        """Generate marketing content pack for listing."""
        
        features = listing.get("features_json", {})
        features_text = ", ".join([k.replace("_", " ").title() 
                                    for k, v in features.items() if v]) if features else ""
        
        prompt = f"""Create a complete marketing content pack for this property:

Property Details:
- Address: {listing.get('address', '')}, {listing.get('suburb', '')}
- Type: {listing.get('type', 'sale')}
- Price: {listing.get('price_display', 'Contact agent')}
- Bedrooms: {listing.get('bedrooms', 'N/A')}
- Bathrooms: {listing.get('bathrooms', 'N/A')}
- Features: {features_text}
- Description: {listing.get('description_raw', '')[:500]}

Generate JSON with:
{{
    "caption_short": "30 words for Instagram",
    "caption_long": "100 words for Facebook",
    "hashtags": ["10 relevant hashtags"],
    "cta": "Call to action",
    "whatsapp": "Friendly WhatsApp message",
    "email_subject": "Email subject line",
    "email_body": "Professional email body (2 paragraphs)",
    "sms": "Short SMS message",
    "reel_script": {{
        "hook": "First 3 seconds grab attention",
        "scene_1": "Feature highlight",
        "scene_2": "Lifestyle shot",
        "scene_3": "Call to action"
    }},
    "portal_description": "Real estate portal description (150 words)",
    "key_selling_points": ["5 bullet points"]
}}

Tone: {tone}
Make it compelling and professional."""
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a real estate marketing expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=1500
            )
            
            content = response.choices[0].message.content
            
            # Parse JSON
            try:
                content_json = json.loads(content)
            except:
                content_json = {"raw": content}
            
            return {
                "content": content_json,
                "model": self.model,
                "tokens_used": response.usage.total_tokens,
                "pack_type": pack_type,
                "tone": tone,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def transcribe_voice(self, audio_path: str) -> Dict:
        """Transcribe voice note using Whisper."""
        
        try:
            with open(audio_path, "rb") as audio_file:
                transcript = await openai.Audio.atranscribe(
                    "whisper-1",
                    audio_file
                )
            
            return {
                "transcript": transcript.text,
                "model": "whisper-1",
                "processed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def extract_facts_from_transcript(self, transcript: str) -> Dict:
        """Extract structured facts from voice transcript."""
        
        prompt = f"""Extract structured information from this property description:

"{transcript}"

Extract and return JSON:
{{
    "bedrooms": number or null,
    "bathrooms": number or null,
    "carspaces": number or null,
    "features": ["list of features mentioned"],
    "nearby_amenities": ["schools", "shops", etc],
    "condition": "description of property condition",
    "vibe": "overall feel/atmosphere",
    "selling_points": ["key selling points"],
    "confidence": "high/medium/low"
}}

Be accurate. If info not mentioned, use null."""
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You extract property details from descriptions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            
            try:
                facts = json.loads(content)
            except:
                facts = {"raw": content}
            
            return {
                "facts": facts,
                "model": self.model,
                "tokens_used": response.usage.total_tokens
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    async def analyze_lead_intent(self, messages: List[str]) -> Dict:
        """Analyze lead intent from messages."""
        
        messages_text = "\n".join(messages)
        
        prompt = f"""Analyze this lead's intent based on their messages:

Messages:
{messages_text}

Return JSON:
{{
    "intent": "buying/selling/investing/researching",
    "urgency": "immediate/soon/future/unknown",
    "budget_indicator": "high/medium/low/unknown",
    "timeline": "immediate/1-3 months/3-6 months/unknown",
    "preferences": ["what they're looking for"],
    "concerns": ["any hesitations mentioned"],
    "next_best_action": "suggested agent action",
    "confidence": "high/medium/low"
}}

Be insightful and actionable."""
        
        try:
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You analyze lead intent for real estate agents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=400
            )
            
            content = response.choices[0].message.content
            
            try:
                analysis = json.loads(content)
            except:
                analysis = {"raw": content}
            
            return {
                "analysis": analysis,
                "model": self.model,
                "tokens_used": response.usage.total_tokens
            }
            
        except Exception as e:
            return {"error": str(e)}

# Export
__all__ = ['ClippyAIEngine']
