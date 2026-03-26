"""
Listing Content Generator for Real Estate Agents
Creates platform-specific descriptions and WhatsApp messages
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class PropertyDetails:
    """Property information for content generation"""
    address: str
    suburb: str
    state: str
    postcode: str
    beds: int
    baths: int
    cars: int
    price: Optional[str]
    land_size: Optional[str]
    property_type: str  # house, unit, apartment, etc.
    features: List[str]
    highlights: List[str]
    agent_name: str
    agent_phone: str

class ListingContentGenerator:
    """Generate listing content for multiple platforms"""
    
    def __init__(self):
        self.platforms = {
            'realestate_com_au': self._generate_realestate_description,
            'domain_com_au': self._generate_domain_description,
            'facebook': self._generate_facebook_post,
            'instagram': self._generate_instagram_caption,
            'whatsapp': self._generate_whatsapp_message,
            'sms': self._generate_sms_message
        }
    
    def generate_all_content(self, property: PropertyDetails) -> Dict[str, str]:
        """Generate content for all platforms at once"""
        return {
            'realestate_com_au': self._generate_realestate_description(property),
            'domain_com_au': self._generate_domain_description(property),
            'facebook': self._generate_facebook_post(property),
            'instagram': self._generate_instagram_caption(property),
            'whatsapp': self._generate_whatsapp_message(property),
            'whatsapp_short': self._generate_whatsapp_short(property),
            'sms': self._generate_sms_message(property),
            'email_subject': self._generate_email_subject(property),
            'email_body': self._generate_email_body(property)
        }
    
    def _generate_realestate_description(self, p: PropertyDetails) -> str:
        """Professional description for realestate.com.au"""
        
        features_text = ', '.join(p.features[:5]) if p.features else 'modern finishes'
        
        price_text = f"Priced at {p.price}" if p.price else "Contact agent for price"
        
        return f"""Welcome to {p.address}, a stunning {p.property_type} in the sought-after suburb of {p.suburb}.

This beautiful property offers {p.beds} generous bedrooms, {p.baths} {'bathrooms' if p.baths > 1 else 'bathroom'} and {p.cars} {'car spaces' if p.cars > 1 else 'car space'}.

Key Features:
{chr(10).join(['• ' + f for f in p.features[:8]]) if p.features else '• Modern finishes throughout'}

The open-plan living areas create a seamless flow between indoor and outdoor spaces, perfect for entertaining or relaxing with family.

Located in {p.suburb}, you'll enjoy easy access to local schools, shopping centres, parks and public transport. The CBD is just a short commute away.

{price_text}. Don't miss this opportunity to secure your dream home.

Contact {p.agent_name} on {p.agent_phone} to arrange a private inspection."""
    
    def _generate_domain_description(self, p: PropertyDetails) -> str:
        """Description optimized for Domain.com.au"""
        
        highlights = p.highlights[:3] if p.highlights else p.features[:3]
        
        return f"""🏡 {p.beds}BED | {p.baths}BATH | {p.cars}CAR | {p.suburb}

Discover modern living at {p.address}. This {p.property_type} is positioned in one of {p.suburb}'s most desirable locations.

✨ HIGHLIGHTS:
{chr(10).join(['✓ ' + h for h in highlights])}

Perfect for families, downsizers or investors seeking quality and convenience.

📍 Location Highlights:
• Walking distance to schools and shops
• Close to public transport
• Easy CBD access
• Family-friendly neighbourhood

{p.price if p.price else 'Contact for price guide'}

📞 {p.agent_name}: {p.agent_phone}

Inspections by appointment."""
    
    def _generate_facebook_post(self, p: PropertyDetails) -> str:
        """Facebook post format"""
        
        emojis = ['🏡', '🏠', '✨', '🔑', '💎']
        
        return f"""{emojis[0]} NEW LISTING: {p.suburb}

{p.beds} beds | {p.baths} baths | {p.cars} cars

This beautiful {p.property_type} at {p.address} has just hit the market! 

{chr(10).join(['✅ ' + f for f in p.features[:4]]) if p.features else '✅ Modern living\n✅ Great location\n✅ Move-in ready'}

{p.price if p.price else 'Contact for price'}

Open inspections this weekend - don't miss out!

📞 Call {p.agent_name}: {p.agent_phone}
💬 Message us to book a private viewing

#{p.suburb.replace(' ', '')} #RealEstate #{p.state} #Property #ForSale #DreamHome"""
    
    def _generate_instagram_caption(self, p: PropertyDetails) -> str:
        """Instagram caption with hashtags"""
        
        return f"""✨ JUST LISTED ✨

Swipe to see why this {p.suburb} {p.property_type} is special →

{p.beds} 🛏️ | {p.baths} 🛁 | {p.cars} 🚗

{'. '.join(p.highlights[:2]) if p.highlights else 'Stunning property in prime location'}

📍 {p.address}
💰 {p.price if p.price else 'DM for price'}

Save this post and share with someone looking for their dream home! ❤️

📞 {p.agent_name}: {p.agent_phone}

.
.
.
#{p.suburb.replace(' ', '')} #{p.state} #realestate #property #forsale #house #home #investment #luxury #lifestyle #australia #sydney #melbourne #brisbane #realtor #realestateagent"""
    
    def _generate_whatsapp_message(self, p: PropertyDetails) -> str:
        """Complete WhatsApp message for sharing"""
        
        return f"""🏡 *NEW LISTING - {p.suburb}*

*{p.address}*

{p.beds} beds | {p.baths} baths | {p.cars} cars

{'. '.join(p.highlights[:2]) if p.highlights else 'Beautiful ' + p.property_type + ' in sought-after location'}

*Features:*
{chr(10).join(['• ' + f for f in p.features[:5]]) if p.features else '• Modern throughout\n• Great location'}

*Price:* {p.price if p.price else 'Contact for price'}

📞 *{p.agent_name}*: {p.agent_phone}

_Reply for more info or to book inspection_

🔗 View online: https://useclippy.com/listing/[ID]"""
    
    def _generate_whatsapp_short(self, p: PropertyDetails) -> str:
        """Short WhatsApp message for quick sharing"""
        
        return f"""🏡 *{p.suburb}* - {p.beds}bed/{p.baths}bath

{p.address}

{p.price if p.price else 'Contact for price'}

📞 {p.agent_name}: {p.agent_phone}

Interested? Reply YES for more info"""
    
    def _generate_sms_message(self, p: PropertyDetails) -> str:
        """SMS format (160 char limit)"""
        
        # Keep it short for SMS
        return f"New listing: {p.beds}bed/{p.baths}bath in {p.suburb}. {p.price if p.price else 'Contact for price'}. Call {p.agent_name} {p.agent_phone}"
    
    def _generate_email_subject(self, p: PropertyDetails) -> str:
        """Email subject line"""
        
        subjects = [
            f"🏡 NEW: {p.beds} bedroom {p.property_type} in {p.suburb}",
            f"Just Listed: {p.address}",
            f"Your dream home in {p.suburb} is waiting"
        ]
        
        return subjects[0]  # Return first option
    
    def _generate_email_body(self, p: PropertyDetails) -> str:
        """Email body for prospecting"""
        
        return f"""Hi there,

I'm excited to share a new listing that just came on the market:

🏡 *{p.address}*

{p.beds} bedrooms | {p.baths} bathrooms | {p.cars} car spaces

{'. '.join(p.highlights[:3]) if p.highlights else 'This beautiful property offers modern living in a fantastic location.'}

Key Features:
{chr(10).join(['• ' + f for f in p.features[:6]]) if p.features else '• Modern throughout'}

Price: {p.price if p.price else 'Contact for price guide'}

Open for inspection this Saturday and Sunday. Would you like to view?

Best regards,
{p.agent_name}
{p.agent_phone}

---
View all listings: https://useclippy.com"""
    
    def generate_quick_copy_messages(self, p: PropertyDetails) -> Dict[str, Dict]:
        """Generate messages optimized for quick copy-paste"""
        
        return {
            'whatsapp': {
                'label': 'WhatsApp (Full)',
                'icon': '💬',
                'content': self._generate_whatsapp_message(p),
                'character_count': len(self._generate_whatsapp_message(p)),
                'best_for': 'Sharing with interested buyers'
            },
            'whatsapp_short': {
                'label': 'WhatsApp (Quick)',
                'icon': '⚡',
                'content': self._generate_whatsapp_short(p),
                'character_count': len(self._generate_whatsapp_short(p)),
                'best_for': 'Quick sharing to groups'
            },
            'facebook': {
                'label': 'Facebook Post',
                'icon': '📘',
                'content': self._generate_facebook_post(p),
                'character_count': len(self._generate_facebook_post(p)),
                'best_for': 'Facebook page posts'
            },
            'instagram': {
                'label': 'Instagram',
                'icon': '📷',
                'content': self._generate_instagram_caption(p),
                'character_count': len(self._generate_instagram_caption(p)),
                'best_for': 'Instagram posts'
            },
            'sms': {
                'label': 'SMS/Text',
                'icon': '📱',
                'content': self._generate_sms_message(p),
                'character_count': len(self._generate_sms_message(p)),
                'best_for': 'SMS blasts'
            },
            'realestate': {
                'label': 'Realestate.com.au',
                'icon': '🏠',
                'content': self._generate_realestate_description(p),
                'character_count': len(self._generate_realestate_description(p)),
                'best_for': 'Property portals'
            }
        }

# Global generator
listing_generator = ListingContentGenerator()

# API functions
def create_listing_content(property_data: Dict) -> Dict:
    """Generate all listing content from property data"""
    
    # Convert dict to PropertyDetails
    prop = PropertyDetails(
        address=property_data.get('address', ''),
        suburb=property_data.get('suburb', ''),
        state=property_data.get('state', ''),
        postcode=property_data.get('postcode', ''),
        beds=property_data.get('beds', 3),
        baths=property_data.get('baths', 2),
        cars=property_data.get('cars', 1),
        price=property_data.get('price'),
        land_size=property_data.get('land_size'),
        property_type=property_data.get('property_type', 'house'),
        features=property_data.get('features', []),
        highlights=property_data.get('highlights', []),
        agent_name=property_data.get('agent_name', 'Agent'),
        agent_phone=property_data.get('agent_phone', '')
    )
    
    return listing_generator.generate_quick_copy_messages(prop)
