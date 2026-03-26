#!/usr/bin/env python3
"""
Generate Clippy extension icons
Creates PNG icons for Chrome Web Store
"""

import struct
import zlib
import os

def create_png(width, height, color_rgb):
    """Create simple PNG with solid color"""
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    def chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # Header
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    
    # Create image data (solid color)
    r, g, b = color_rgb
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # Filter type
        for x in range(width):
            raw_data += bytes([r, g, b])
    
    compressed = zlib.compress(raw_data)
    idat = chunk(b'IDAT', compressed)
    
    # End chunk
    iend = chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

# Clippy brand color (Indigo)
brand_color = (79, 70, 229)  # #4F46E5

# Create icons directory
os.makedirs('icons', exist_ok=True)

# Generate icons
sizes = [16, 32, 48, 128]
for size in sizes:
    png_data = create_png(size, size, brand_color)
    filename = f'icons/icon{size}.png'
    with open(filename, 'wb') as f:
        f.write(png_data)
    print(f'✅ Created {filename} ({size}x{size})')

print('\n🎉 All icons ready for Chrome Web Store!')
