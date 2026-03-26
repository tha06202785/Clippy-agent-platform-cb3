"""
Enhanced Content Pack Generator for Clippy
Creates portal descriptions and reel scripts with timestamps
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
import json

@dataclass
class ReelBeat:
    """Single beat in a reel script"""
    timestamp: str  # 0:00, 0:15, etc.
    duration_sec: int
    visual: str
    audio_voiceover: str
    text_on_screen: str
    hook_strength: int  # 1-10

class EnhancedContentGenerator:
    """Generate enhanced content for listings"""
    
    def __init__(self):
        self.templates = {
            'reels': {
                'hook_opening': [
                    "POV: You just found your dream home 👀",
                    "This kitchen alone is worth $50k 😍",
                    "Wait for the backyard reveal... 🏡",
                    "Stop scrolling if you love {feature} ❤️",
                    "3 beds, 2 baths, 1 incredible location 📍"
                ],
                'transitions': [
                    "But wait...",
                    "And then you see...",
                    "The best part?",
                    "Just when you thought it couldn't get better...",
                    "Here's the kicker:"
                ]
            }
        }
    
    def generate_portal_description(self, 
                                   listing_data: Dict,
                                   style: str = "professional") -> str:
        """
        Generate property description for real estate portals
        
        Args:
            listing_data: Property details
            style: 'professional', 'luxury', 'family', 'investor'
        
        Returns:
            Formatted description for portals (realestate.com.au, etc.)
        """
        address = listing_data.get('address', 'This property')
        beds = listing_data.get('beds', 3)
        baths = listing_data.get('baths', 2)
        cars = listing_data.get('cars', 1)
        price = listing_data.get('price', None)
        
        # Opening based on style
        if style == "luxury":
            opening = f"Welcome to {address}, an exquisite residence that defines sophisticated living."
        elif style == "family":
            opening = f"Perfect for growing families, {address} offers the space and comfort you've been searching for."
        elif style == "investor":
            opening = f"Presenting a prime investment opportunity at {address} with exceptional rental potential."
        else:  # professional
            opening = f"{address} offers a perfect blend of modern comfort and convenient location."
        
        # Features paragraph
        features = f"""Featuring {beds} generous bedrooms including master with ensuite, 
{int(baths)} {'bathrooms' if baths > 1 else 'bathroom'}, and secure parking for {int(cars)} {'vehicles' if cars > 1 else 'vehicle'}.
The open-plan living areas create a seamless flow between indoor and outdoor spaces,
perfect for entertaining or relaxing with family."""
        
        # Location highlights
        location = """Conveniently located close to schools, shopping centers, and public transport,
with easy access to major highways and the CBD just minutes away."""
        
        # Call to action
        cta = """Don't miss this opportunity to secure your dream home.
Contact us today to arrange a private inspection."""
        
        if price:
            price_text = f"Priced at {price} - offers welcome."
        else:
            price_text = "Price guide available on application."
        
        return f"""{opening}

{features}

{location}

{price_text}

{cta}"""
    
    def generate_reel_script(self, 
                            listing_data: Dict,
                            style: str = "trendy",
                            duration_sec: int = 60) -> List[ReelBeat]:
        """
        Generate Instagram/TikTok reel script with timestamps
        
        Args:
            listing_data: Property details
            style: 'trendy', 'luxury', 'quick_tour', 'behind_scenes'
            duration_sec: Total video length
        
        Returns:
            List of ReelBeat objects with full script
        """
        address = listing_data.get('address', 'This stunning property')
        beds = listing_data.get('beds', 3)
        baths = listing_data.get('baths', 2)
        feature = listing_data.get('top_feature', 'the backyard')
        
        if style == "trendy":
            return self._generate_trendy_reel(address, beds, baths, feature, duration_sec)
        elif style == "luxury":
            return self._generate_luxury_reel(address, beds, baths, feature, duration_sec)
        elif style == "quick_tour":
            return self._generate_quick_tour(address, beds, baths, feature, duration_sec)
        else:
            return self._generate_trendy_reel(address, beds, baths, feature, duration_sec)
    
    def _generate_trendy_reel(self, address, beds, baths, feature, duration) -> List[ReelBeat]:
        """Generate trendy viral-style reel"""
        beats = [
            ReelBeat(
                timestamp="0:00",
                duration_sec=3,
                visual="Exterior shot, slow zoom on front door",
                audio_voiceover="POV: You just found your dream home",
                text_on_screen="POV: You found the ONE 👀",
                hook_strength=9
            ),
            ReelBeat(
                timestamp="0:03",
                duration_sec=4,
                visual="Fast walk through entrance to living room",
                audio_voiceover="Three bedrooms, two bathrooms",
                text_on_screen=f"{beds} beds • {baths} baths 🏠",
                hook_strength=6
            ),
            ReelBeat(
                timestamp="0:07",
                duration_sec=5,
                visual="Kitchen reveal with dramatic lighting",
                audio_voiceover="But wait until you see this kitchen",
                text_on_screen="WAIT FOR IT... 👇",
                hook_strength=8
            ),
            ReelBeat(
                timestamp="0:12",
                duration_sec=6,
                visual=f"{feature} reveal with slow pan",
                audio_voiceover=f"This {feature} is absolutely incredible",
                text_on_screen="THIS IS EVERYTHING 😍",
                hook_strength=10
            ),
            ReelBeat(
                timestamp="0:18",
                duration_sec=4,
                visual="Quick cuts of bedrooms",
                audio_voiceover="And the bedrooms are just as stunning",
                text_on_screen="BEDROOM TOUR 👆",
                hook_strength=7
            ),
            ReelBeat(
                timestamp="0:22",
                duration_sec=5,
                visual="Location shots - street, nearby amenities",
                audio_voiceover=f"Located at {address}",
                text_on_screen="PRIME LOCATION 📍",
                hook_strength=7
            ),
            ReelBeat(
                timestamp="0:27",
                duration_sec=3,
                visual="Agent speaking to camera in front of house",
                audio_voiceover="Inspections this weekend",
                text_on_screen="OPEN SAT & SUN ✨",
                hook_strength=6
            ),
            ReelBeat(
                timestamp="0:30",
                duration_sec=4,
                visual="Contact details + CTA screen",
                audio_voiceover="Don't miss out, contact us today",
                text_on_screen="LINK IN BIO 📲",
                hook_strength=8
            )
        ]
        
        return beats
    
    def _generate_luxury_reel(self, address, beds, baths, feature, duration) -> List[ReelBeat]:
        """Generate luxury/high-end reel"""
        beats = [
            ReelBeat(
                timestamp="0:00",
                duration_sec=4,
                visual="Cinematic drone shot approaching property",
                audio_voiceover="An address that speaks for itself",
                text_on_screen="Luxury Defined",
                hook_strength=9
            ),
            ReelBeat(
                timestamp="0:04",
                duration_sec=5,
                visual="Slow motion through grand entrance",
                audio_voiceover="Where elegance meets lifestyle",
                text_on_screen=f"{address}",
                hook_strength=8
            ),
            ReelBeat(
                timestamp="0:09",
                duration_sec=6,
                visual="Premium finishes showcase",
                audio_voiceover="Every detail thoughtfully designed",
                text_on_screen="Meticulously Crafted",
                hook_strength=7
            ),
            ReelBeat(
                timestamp="0:15",
                duration_sec=5,
                visual="Feature highlight - pool, view, etc.",
                audio_voiceover="This is luxury living at its finest",
                text_on_screen="Simply Extraordinary",
                hook_strength=10
            ),
            ReelBeat(
                timestamp="0:20",
                duration_sec=5,
                visual="Evening shots with lighting",
                audio_voiceover="Your new chapter begins here",
                text_on_screen="Book Your Private Tour",
                hook_strength=8
            )
        ]
        
        return beats
    
    def _generate_quick_tour(self, address, beds, baths, feature, duration) -> List[ReelBeat]:
        """Generate fast 30-second tour"""
        beats = [
            ReelBeat(
                timestamp="0:00",
                duration_sec=2,
                visual="Exterior shot",
                audio_voiceover=f"{beds} bed, {baths} bath at {address}",
                text_on_screen=f"{beds}BR • {baths}BA",
                hook_strength=7
            ),
            ReelBeat(
                timestamp="0:02",
                duration_sec=4,
                visual="Living area",
                audio_voiceover="Open plan living",
                text_on_screen="",
                hook_strength=5
            ),
            ReelBeat(
                timestamp="0:06",
                duration_sec=4,
                visual="Kitchen",
                audio_voiceover="Modern kitchen",
                text_on_screen="",
                hook_strength=5
            ),
            ReelBeat(
                timestamp="0:10",
                duration_sec=4,
                visual="Master bedroom",
                audio_voiceover="Spacious master",
                text_on_screen="",
                hook_strength=5
            ),
            ReelBeat(
                timestamp="0:14",
                duration_sec=6,
                visual=f"{feature} highlight",
                audio_voiceover=f"Amazing {feature}",
                text_on_screen="⭐ FEATURED",
                hook_strength=9
            ),
            ReelBeat(
                timestamp="0:20",
                duration_sec=2,
                visual="Agent + contact info",
                audio_voiceover="Call today",
                text_on_screen="📞 CONTACT US",
                hook_strength=6
            )
        ]
        
        return beats
    
    def generate_email_sequence(self, 
                              listing_data: Dict,
                              agent_name: str = "Your Agent") -> Dict[str, str]:
        """Generate email sequence for listing marketing"""
        address = listing_data.get('address', 'This property')
        price = listing_data.get('price', 'Contact for price')
        
        # Email 1: Just Listed
        email_1 = f"""Subject: 🏠 NEW LISTING: {address}

Hi there,

I'm excited to introduce {address}, now available for sale.

{price}

Key features:
• {listing_data.get('beds', 3)} bedrooms
• {listing_data.get('baths', 2)} bathrooms  
• {listing_data.get('cars', 1)} car spaces

Open inspections this Saturday and Sunday.

Reply to book your private viewing.

Best regards,
{agent_name}"""

        # Email 2: Price Drop
        email_2 = f"""Subject: Price Update: {address}

Hi there,

Great news! The sellers are motivated and have adjusted the price on {address}.

New price: {price}

This represents excellent value in today's market. Don't miss this opportunity.

Inspections available by appointment.

{agent_name}"""

        # Email 3: Final Call
        email_3 = f"""Subject: Final Days: {address}

Hi there,

This is your last chance to inspect {address} before offers are presented.

{price}

Don't let this opportunity slip away.

Final inspection: [DATE]

{agent_name}"""

        return {
            'just_listed': email_1,
            'price_update': email_2,
            'final_call': email_3
        }

# Global generator instance
generator = EnhancedContentGenerator()

# API functions
def generate_content_pack(listing_data: Dict) -> Dict:
    """Generate complete content pack for a listing"""
    return {
        'portal_description_professional': generator.generate_portal_description(listing_data, 'professional'),
        'portal_description_luxury': generator.generate_portal_description(listing_data, 'luxury'),
        'portal_description_family': generator.generate_portal_description(listing_data, 'family'),
        'reel_script_trendy': generator.generate_reel_script(listing_data, 'trendy'),
        'reel_script_luxury': generator.generate_reel_script(listing_data, 'luxury'),
        'reel_script_quick': generator.generate_reel_script(listing_data, 'quick_tour'),
        'email_sequence': generator.generate_email_sequence(listing_data)
    }
