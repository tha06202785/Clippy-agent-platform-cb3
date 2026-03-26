"""
Email Parser for Clippy
Extracts lead information from incoming emails
"""

import re
import email
from email import policy
from email.parser import BytesParser
from typing import Dict, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime
import json

@dataclass
class ParsedLead:
    """Structured lead data from email"""
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    source: str  # 'email_parser'
    interest: Optional[str]  # buying, selling, renting, etc.
    message: Optional[str]
    property_address: Optional[str]
    raw_body: str
    confidence: float  # 0.0 - 1.0

class EmailLeadParser:
    """Parse incoming emails and extract lead information"""
    
    def __init__(self):
        # Common patterns for extracting info
        self.patterns = {
            'email': re.compile(r'[\w\.-]+@[\w\.-]+\.\w+'),
            'phone_aus': re.compile(r'(?:\+?61|0)[\d\s]{8,10}'),
            'phone_us': re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'),
            'name_prefix': re.compile(r'(?:name|from|sender)[:\s]*([\w\s]{2,50})', re.IGNORECASE),
        }
        
        # Keywords for interest detection
        self.interest_keywords = {
            'buying': ['buy', 'purchase', 'looking for', 'interested in buying', 'want to buy'],
            'selling': ['sell', 'selling', 'list', 'listing', 'want to sell', 'appraisal'],
            'renting': ['rent', 'renting', 'lease', 'leasing', 'tenant'],
            'appraisal': ['appraisal', 'valuation', 'value', 'worth', 'market value'],
            'general': ['inquiry', 'question', 'information', 'contact']
        }
    
    def parse_email(self, email_content: bytes, subject: str = "") -> ParsedLead:
        """Parse email bytes and extract lead info"""
        try:
            # Parse email
            msg = BytesParser(policy=policy.default).parsebytes(email_content)
            
            # Extract body
            body = self._extract_body(msg)
            full_text = f"{subject} {body}"
            
            # Extract fields
            name = self._extract_name(msg, body)
            email_addr = self._extract_email(msg, body)
            phone = self._extract_phone(body)
            interest = self._detect_interest(full_text)
            property_addr = self._extract_property_address(body)
            
            # Calculate confidence
            confidence = self._calculate_confidence(name, email_addr, phone)
            
            return ParsedLead(
                name=name,
                email=email_addr,
                phone=phone,
                source='email_parser',
                interest=interest,
                message=body[:500],  # First 500 chars
                property_address=property_addr,
                raw_body=body,
                confidence=confidence
            )
            
        except Exception as e:
            return ParsedLead(
                name=None,
                email=None,
                phone=None,
                source='email_parser',
                interest=None,
                message=f"Parse error: {str(e)}",
                property_address=None,
                raw_body=email_content.decode('utf-8', errors='ignore')[:1000],
                confidence=0.0
            )
    
    def parse_text(self, text: str, subject: str = "") -> ParsedLead:
        """Parse plain text (for web forms, etc.)"""
        full_text = f"{subject} {text}"
        
        name = self._extract_name_from_text(text)
        email_addr = self._extract_email_from_text(text)
        phone = self._extract_phone(text)
        interest = self._detect_interest(full_text)
        property_addr = self._extract_property_address(text)
        
        confidence = self._calculate_confidence(name, email_addr, phone)
        
        return ParsedLead(
            name=name,
            email=email_addr,
            phone=phone,
            source='text_parser',
            interest=interest,
            message=text[:500],
            property_address=property_addr,
            raw_body=text,
            confidence=confidence
        )
    
    def _extract_body(self, msg) -> str:
        """Extract plain text body from email"""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == 'text/plain':
                    return part.get_content()
                elif content_type == 'text/html':
                    # Simple HTML strip (could use BeautifulSoup)
                    html = part.get_content()
                    return self._strip_html(html)
        else:
            return msg.get_content()
        return ""
    
    def _strip_html(self, html: str) -> str:
        """Basic HTML tag removal"""
        import re
        text = re.sub('<[^<]+?>', ' ', html)
        return re.sub('\s+', ' ', text).strip()
    
    def _extract_name(self, msg, body: str) -> Optional[str]:
        """Extract sender name"""
        # From email headers
        from_header = msg.get('From', '')
        if '<' in from_header:
            name = from_header.split('<')[0].strip()
            if name and name != from_header:
                return name.strip('"')
        
        # From body patterns
        return self._extract_name_from_text(body)
    
    def _extract_name_from_text(self, text: str) -> Optional[str]:
        """Try to find name in text"""
        # Look for patterns like "My name is John Smith"
        patterns = [
            r'my name is[:\s]+([A-Z][a-z]+\s[A-Z][a-z]+)',
            r'name[:\s]+([A-Z][a-z]+\s[A-Z][a-z]+)',
            r'from[:\s]+([A-Z][a-z]+\s[A-Z][a-z]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_email(self, msg, body: str) -> Optional[str]:
        """Extract email address"""
        # From headers
        from_header = msg.get('From', '')
        match = self.patterns['email'].search(from_header)
        if match:
            return match.group(0)
        
        # From body
        return self._extract_email_from_text(body)
    
    def _extract_email_from_text(self, text: str) -> Optional[str]:
        """Find email in text"""
        match = self.patterns['email'].search(text)
        return match.group(0) if match else None
    
    def _extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number"""
        # Try Australian format first
        match = self.patterns['phone_aus'].search(text)
        if match:
            return match.group(0).replace(' ', '')
        
        # Try US format
        match = self.patterns['phone_us'].search(text)
        if match:
            return match.group(0)
        
        return None
    
    def _detect_interest(self, text: str) -> Optional[str]:
        """Detect what the lead is interested in"""
        text_lower = text.lower()
        
        scores = {}
        for interest, keywords in self.interest_keywords.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[interest] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return 'general'
    
    def _extract_property_address(self, text: str) -> Optional[str]:
        """Try to find property address"""
        # Simple patterns for Australian addresses
        patterns = [
            r'\d+\s+[\w\s]+(?:street|st|road|rd|avenue|ave|drive|dr|place|pl|lane|ln)',
            r'(?:at|property|address)[:\s]+([\d\w\s]+(?:street|st|road|rd))',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return None
    
    def _calculate_confidence(self, name, email, phone) -> float:
        """Calculate confidence score"""
        score = 0.0
        
        if name:
            score += 0.3
        if email:
            score += 0.4
        if phone:
            score += 0.3
        
        return min(score, 1.0)
    
    def to_lead_dict(self, parsed: ParsedLead, org_id: str) -> Dict:
        """Convert ParsedLead to Clippy lead format"""
        return {
            'org_id': org_id,
            'name': parsed.name or 'Unknown',
            'email': parsed.email,
            'phone': parsed.phone,
            'source': parsed.source,
            'status': 'new',
            'temperature': 'warm' if parsed.confidence > 0.7 else 'cold',
            'ai_summary': f"Interest: {parsed.interest}. Property: {parsed.property_address or 'N/A'}",
            'created_at': datetime.utcnow().isoformat(),
            'confidence': parsed.confidence,
            'raw_data': {
                'message': parsed.message,
                'property_address': parsed.property_address
            }
        }

# Global parser instance
parser = EmailLeadParser()

# API functions
def parse_incoming_email(email_bytes: bytes, subject: str, org_id: str) -> Dict:
    """Parse incoming email and return lead dict"""
    parsed = parser.parse_email(email_bytes, subject)
    return parser.to_lead_dict(parsed, org_id)

def parse_text_form(text: str, org_id: str) -> Dict:
    """Parse text from web form"""
    parsed = parser.parse_text(text)
    return parser.to_lead_dict(parsed, org_id)
