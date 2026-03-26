"""
Agent Voice Personalization System for Clippy
Creates unique, personalized content that matches each agent's style
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import json

class ToneStyle(Enum):
    """Different writing tones"""
    LUXURY = "luxury"           # Sophisticated, elegant
    FAMILY = "family"           # Warm, welcoming  
    INVESTMENT = "investment"   # Data-driven, professional
    ENERGETIC = "energetic"     # Exciting, punchy
    PROFESSIONAL = "professional"  # Corporate, formal
    CASUAL = "casual"           # Friendly, approachable
    MINIMAL = "minimal"         # Short, factual

class PropertyType(Enum):
    """Property categories"""
    LUXURY = "luxury"
    FAMILY = "family_home"
    INVESTMENT = "investment"
    FIRST_HOME = "first_home"
    DOWNSIZER = "downsizer"
    RURAL = "rural"
    WATERFRONT = "waterfront"
    NEW_DEVELOPMENT = "new_development"

@dataclass
class AgentVoiceProfile:
    """Complete voice profile for an agent"""
    agent_id: str
    agent_name: str
    agency_name: str
    
    # Core voice settings
    default_tone: ToneStyle = ToneStyle.PROFESSIONAL
    writing_style: str = "balanced"  # descriptive, concise, storytelling
    
    # Personality traits (1-10 scale)
    formality_level: int = 7          # 1=casual, 10=formal
    enthusiasm_level: int = 6         # 1=reserved, 10=excited
    technical_detail: int = 5        # 1=minimal, 10=detailed
    emoji_usage: int = 3              # 1=none, 10=heavy
    
    # Content preferences
    opening_style: str = "feature"     # feature, question, statement
    closing_style: str = "cta"         # cta, question, statement
    
    # Custom phrases agent likes to use
    catch_phrases: List[str] = field(default_factory=list)
    
    # Agent's unique expressions (from past listings)
    common_words: List[str] = field(default_factory=list)
    sentence_structure: str = "mixed"  # short, long, mixed
    
    # Platform-specific preferences
    whatsapp_style: str = "concise"   # concise, detailed
    instagram_style: str = "visual"   # visual, lifestyle
    facebook_style: str = "engaging"  # engaging, informative
    
    # Property type specializations
    property_specialties: List[PropertyType] = field(default_factory=list)
    
    # Training data (example past listings)
    sample_listings: List[Dict] = field(default_factory=list)

class VoicePersonalizer:
    """Personalize AI content to match agent's voice"""
    
    def __init__(self):
        self.tone_prompts = {
            ToneStyle.LUXURY: """
                Write in a sophisticated, elegant tone. Use words like:
                - exquisite, bespoke, sanctuary, residence, lifestyle
                - Focus on quality, craftsmanship, exclusivity
                - Create aspirational imagery
                - Avoid exclamation marks, keep it refined
            """,
            ToneStyle.FAMILY: """
                Write in a warm, welcoming tone. Use words like:
                - perfect for families, generous spaces, backyard fun
                - Focus on lifestyle, community, growing family
                - Create emotional connection
                - Friendly and approachable
            """,
            ToneStyle.INVESTMENT: """
                Write in a data-driven, professional tone. Use words like:
                - rental yield, capital growth, ROI, market analysis
                - Focus on numbers, potential returns, location metrics
                - Be factual and persuasive
                - Professional and confident
            """,
            ToneStyle.ENERGETIC: """
                Write in an exciting, energetic tone. Use words like:
                - amazing, incredible, must-see, won't last
                - Use exclamation marks
                - Create urgency and excitement
                - Punchy sentences
            """,
            ToneStyle.PROFESSIONAL: """
                Write in a corporate, formal tone. Use words like:
                - presents, offers, features, situated
                - Focus on facts and features
                - Neutral and informative
                - Clear and structured
            """,
            ToneStyle.CASUAL: """
                Write in a friendly, approachable tone. Use words like:
                - great spot, awesome kitchen, love the backyard
                - Like talking to a friend
                - Relaxed and informal
                - Use contractions (it's, don't, you're)
            """
        }
        
        self.property_type_contexts = {
            PropertyType.LUXURY: """
                Emphasize: Premium finishes, exclusive location, lifestyle
                Avoid: Budget-conscious terms, "cheap", "fixer-upper"
                Focus: Quality, craftsmanship, prestige
            """,
            PropertyType.FAMILY: """
                Emphasize: Space, schools, parks, safety, community
                Avoid: Party house, bachelor pad, investment terms
                Focus: Family lifestyle, children, neighborhood
            """,
            PropertyType.INVESTMENT: """
                Emphasize: Rental potential, tenant demand, ROI, growth
                Avoid: Emotional language, dream home, forever home
                Focus: Numbers, returns, market data
            """,
            PropertyType.FIRST_HOME: """
                Emphasize: Affordable, starter home, potential
                Avoid: Luxury terms, expensive features
                Focus: Entry point, possibility, first step
            """,
            PropertyType.DOWNSIZER: """
                Emphasize: Low maintenance, single level, lifestyle change
                Avoid: Growing family, lots of space needed
                Focus: Ease, convenience, lifestyle upgrade
            """
        }
    
    def create_personalized_prompt(self, 
                                  agent_voice: AgentVoiceProfile,
                                  property_type: PropertyType,
                                  platform: str = "general") -> str:
        """Create personalized prompt for OpenAI"""
        
        # Base tone
        tone_instruction = self.tone_prompts.get(agent_voice.default_tone, "")
        
        # Property type context
        property_context = self.property_type_contexts.get(property_type, "")
        
        # Agent's catch phrases
        catch_phrases = ""
        if agent_voice.catch_phrases:
            catch_phrases = f"\nOccasionally use these phrases: {', '.join(agent_voice.catch_phrases[:3])}"
        
        # Formality adjustment
        formality_instruction = ""
        if agent_voice.formality_level > 8:
            formality_instruction = "\nUse formal language. Avoid contractions. Be professional."
        elif agent_voice.formality_level < 4:
            formality_instruction = "\nUse casual language. Use contractions. Be friendly."
        
        # Enthusiasm adjustment
        enthusiasm_instruction = ""
        if agent_voice.enthusiasm_level > 7:
            enthusiasm_instruction = "\nBe enthusiastic! Use exclamation marks. Show excitement."
        elif agent_voice.enthusiasm_level < 4:
            enthusiasm_instruction = "\nBe measured and calm. Reserved tone."
        
        # Platform-specific adjustments
        platform_instruction = ""
        if platform == "whatsapp":
            if agent_voice.whatsapp_style == "concise":
                platform_instruction = "\nKeep it concise for WhatsApp. Short paragraphs."
            else:
                platform_instruction = "\nDetailed format for WhatsApp."
        elif platform == "instagram":
            platform_instruction = "\nVisual language. Lifestyle focus. Emoji-friendly."
        elif platform == "facebook":
            platform_instruction = "\nEngaging and social. Community-focused."
        
        # Combine all
        full_prompt = f"""
{ToneStyle.LUXURY.value if agent_voice.default_tone == ToneStyle.LUXURY else ""}
{tone_instruction}

{property_context}
{catch_phrases}
{formality_instruction}
{enthusiasm_instruction}
{platform_instruction}

Write as {agent_voice.agent_name} from {agent_voice.agency_name}.
Make it sound personal and authentic.
"""
        
        return full_prompt.strip()
    
    def analyze_past_listings(self, listings: List[str]) -> Dict:
        """Analyze agent's past listings to extract voice"""
        
        if not listings:
            return {}
        
        analysis = {
            'avg_sentence_length': 0,
            'common_openings': [],
            'common_closings': [],
            'favorite_words': [],
            'uses_exclamations': False,
            'uses_emojis': False,
            'formality_score': 5,
            'suggested_tone': ToneStyle.PROFESSIONAL
        }
        
        # Combine all text
        all_text = ' '.join(listings).lower()
        
        # Check for exclamations
        analysis['uses_exclamations'] = '!' in ' '.join(listings)
        
        # Check for emojis
        emojis = ['🏡', '✨', '🔑', '💎', '😍', '👌']
        analysis['uses_emojis'] = any(emoji in ' '.join(listings) for emoji in emojis)
        
        # Detect tone
        luxury_words = ['luxury', 'elegant', 'prestigious', 'exquisite', 'bespoke']
        family_words = ['family', 'children', 'backyard', 'schools', 'community']
        energetic_words = ['amazing', 'incredible', 'must-see', 'stunning', 'beautiful']
        
        luxury_score = sum(1 for word in luxury_words if word in all_text)
        family_score = sum(1 for word in family_words if word in all_text)
        energetic_score = sum(1 for word in energetic_words if word in all_text)
        
        if luxury_score > 3:
            analysis['suggested_tone'] = ToneStyle.LUXURY
        elif family_score > 3:
            analysis['suggested_tone'] = ToneStyle.FAMILY
        elif energetic_score > 5:
            analysis['suggested_tone'] = ToneStyle.ENERGETIC
        
        return analysis
    
    def generate_voice_training_prompt(self, 
                                      agent_voice: AgentVoiceProfile,
                                      property_details: Dict) -> str:
        """Generate complete prompt for OpenAI with voice personalization"""
        
        # Detect property type
        price = property_details.get('price', '')
        features = property_details.get('features', [])
        
        property_type = PropertyType.FAMILY  # default
        if any(word in str(price).lower() for word in ['luxury', 'prestige', 'high-end']):
            property_type = PropertyType.LUXURY
        elif any(word in str(features).lower() for word in ['investment', 'rental', 'yield']):
            property_type = PropertyType.INVESTMENT
        elif property_details.get('beds', 0) <= 2:
            property_type = PropertyType.FIRST_HOME
        
        # Get personalized prompt
        voice_prompt = self.create_personalized_prompt(agent_voice, property_type)
        
        return voice_prompt

# Global instance
personalizer = VoicePersonalizer()

# API functions
def create_agent_voice_profile(agent_data: Dict) -> AgentVoiceProfile:
    """Create voice profile from agent data"""
    
    # Analyze past listings if provided
    past_listings = agent_data.get('past_listings', [])
    analysis = personalizer.analyze_past_listings(past_listings)
    
    # Create profile
    profile = AgentVoiceProfile(
        agent_id=agent_data.get('id', ''),
        agent_name=agent_data.get('name', 'Agent'),
        agency_name=agent_data.get('agency', ''),
        default_tone=analysis.get('suggested_tone', ToneStyle.PROFESSIONAL),
        writing_style=agent_data.get('writing_style', 'balanced'),
        formality_level=analysis.get('formality_score', 5),
        catch_phrases=agent_data.get('catch_phrases', []),
        sample_listings=past_listings[:5]  # Store examples
    )
    
    return profile

def personalize_listing_content(agent_voice: AgentVoiceProfile,
                               property_details: Dict,
                               platform: str = "general") -> str:
    """Generate personalized prompt for content creation"""
    
    return personalizer.generate_voice_training_prompt(agent_voice, property_details)
