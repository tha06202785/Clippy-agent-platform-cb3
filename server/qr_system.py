#!/usr/bin/env python3
"""
QR CODE / SHORT LINK SYSTEM
For phone call lead capture
"""

import qrcode
import base64
from io import BytesIO
from typing import Dict
import hashlib
from datetime import datetime, timedelta

class QRCodeSystem:
    """Generate QR codes and short links for listings."""
    
    def __init__(self, base_url: str = "https://useclippy.com"):
        self.base_url = base_url
        self.link_prefix = "/l/"  # Short link prefix
    
    def generate_short_code(self, listing_id: str, agent_id: str) -> str:
        """Generate unique short code for listing."""
        # Create hash from listing_id + agent_id + timestamp
        data = f"{listing_id}:{agent_id}:{datetime.now().timestamp()}"
        hash_obj = hashlib.md5(data.encode())
        short_code = hash_obj.hexdigest()[:8]  # First 8 chars
        return short_code
    
    def generate_qr_code(self, short_code: str, size: int = 300) -> str:
        """Generate QR code image as base64."""
        link = f"{self.base_url}{self.link_prefix}{short_code}"
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(link)
        qr.make(fit=True)
        
        # Generate image
        img = qr.make_image(fill_color="black", back_color="white")
        img = img.resize((size, size))
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def create_listing_link(self, 
                           listing_id: str,
                           agent_id: str,
                           org_id: str) -> Dict:
        """Create complete link package for listing."""
        
        short_code = self.generate_short_code(listing_id, agent_id)
        
        # Generate QR code
        qr_base64 = self.generate_qr_code(short_code)
        
        # Create full URL
        short_url = f"{self.base_url}{self.link_prefix}{short_code}"
        
        return {
            "short_code": short_code,
            "short_url": short_url,
            "qr_code": qr_base64,
            "listing_id": listing_id,
            "agent_id": agent_id,
            "org_id": org_id,
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=365)).isoformat()
        }

# API Endpoints for Flask/FastAPI
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)
qr_system = QRCodeSystem()

# HTML Template for capture page
CAPTURE_PAGE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Information - {{ listing_address }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .address {
            color: #666;
            font-size: 18px;
            margin-bottom: 20px;
        }
        .price {
            color: #667eea;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .features {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .feature {
            text-align: center;
        }
        .feature-value {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        .feature-label {
            font-size: 12px;
            color: #666;
        }
        form {
            margin-top: 30px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 15px;
            box-sizing: border-box;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover {
            opacity: 0.9;
        }
        .success {
            display: none;
            text-align: center;
            padding: 30px;
        }
        .success-icon {
            font-size: 60px;
            color: #4CAF50;
            margin-bottom: 20px;
        }
        .thank-you {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
        }
        .next-steps {
            color: #666;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="form-section">
            <h1>{{ listing_address }}</h1>
            <div class="address">{{ listing_suburb }}</div>
            <div class="price">{{ listing_price }}</div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-value">{{ listing_bedrooms }}</div>
                    <div class="feature-label">Bedrooms</div>
                </div>
                <div class="feature">
                    <div class="feature-value">{{ listing_bathrooms }}</div>
                    <div class="feature-label">Bathrooms</div>
                </div>
                <div class="feature">
                    <div class="feature-value">{{ listing_carspaces }}</div>
                    <div class="feature-label">Car</div>
                </div>
            </div>
            
            <p style="color: #666; margin-bottom: 20px;">
                Enter your details below and we'll send you the full property information and inspection times.
            </p>
            
            <form id="captureForm">
                <label>Your Name *</label>
                <input type="text" id="full_name" name="full_name" placeholder="John Smith" required>
                
                <label>Email *</label>
                <input type="email" id="email" name="email" placeholder="john@example.com" required>
                
                <label>Phone *</label>
                <input type="tel" id="phone" name="phone" placeholder="+61 400 000 000" required>
                
                <input type="hidden" id="listing_id" name="listing_id" value="{{ listing_id }}">
                <input type="hidden" id="org_id" name="org_id" value="{{ org_id }}">
                <input type="hidden" id="agent_id" name="agent_id" value="{{ agent_id }}">
                <input type="hidden" id="source" name="source" value="qr_code">
                
                <button type="submit">Get Property Details</button>
            </form>
        </div>
        
        <div id="success-section" class="success">
            <div class="success-icon">✓</div>
            <div class="thank-you">Thank You!</div>
            <div class="next-steps">
                We've sent the property details to your email.<br>
                An agent will contact you shortly.
            </div>
        </div>
    </div>
    
    <script>
        document.getElementById('captureForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                full_name: document.getElementById('full_name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                listing_id: document.getElementById('listing_id').value,
                org_id: document.getElementById('org_id').value,
                agent_id: document.getElementById('agent_id').value,
                source: 'qr_code'
            };
            
            try {
                const response = await fetch('/api/webhooks/lead-capture', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    document.getElementById('form-section').style.display = 'none';
                    document.getElementById('success-section').style.display = 'block';
                } else {
                    alert('Error submitting. Please try again.');
                }
            } catch (error) {
                alert('Network error. Please try again.');
            }
        });
    </script>
</body>
</html>
"""

@app.route("/l/<short_code>", methods=["GET"])
def capture_page(short_code):
    """Display capture page for short link."""
    
    # In production, lookup listing_id from short_code in database
    # For now, show template with placeholder data
    
    return render_template_string(
        CAPTURE_PAGE_HTML,
        listing_address="123 Main Street",
        listing_suburb="Sydney, NSW 2000",
        listing_price="$850,000 - $920,000",
        listing_bedrooms=3,
        listing_bathrooms=2,
        listing_carspaces=1,
        listing_id="listing-uuid-here",
        org_id="org-uuid-here",
        agent_id="agent-uuid-here"
    )

@app.route("/api/qr/generate", methods=["POST"])
def generate_qr():
    """Generate QR code for listing."""
    data = request.json
    
    listing_id = data.get("listing_id")
    agent_id = data.get("agent_id")
    org_id = data.get("org_id")
    
    if not all([listing_id, agent_id, org_id]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Generate link package
    link_package = qr_system.create_listing_link(
        listing_id=listing_id,
        agent_id=agent_id,
        org_id=org_id
    )
    
    # In production, save to database here
    # await save_to_database(link_package)
    
    return jsonify(link_package)

@app.route("/api/qr/download/<short_code>", methods=["GET"])
def download_qr(short_code):
    """Download QR code image."""
    qr_base64 = qr_system.generate_qr_code(short_code, size=600)
    
    return jsonify({
        "qr_code": qr_base64,
        "download_name": f"property-qr-{short_code}.png"
    })

if __name__ == "__main__":
    app.run(debug=True, port=5001)
