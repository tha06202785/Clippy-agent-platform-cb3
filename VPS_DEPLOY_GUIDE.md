# VPS Deployment Instructions for Clippy Demo

## Current Issue
The demo.html page is not accessible because Nginx is proxying all requests to the Node.js app (SPA behavior).

## Solution

### Option 1: Update Nginx Config (Recommended)

1. Copy the updated nginx config to your VPS:
```bash
scp nginx-clippy.conf root@your-vps-ip:/etc/nginx/sites-available/clippy
```

2. Update the paths in the nginx config if your app is in a different location:
   - Change `/var/www/clippy/` to your actual app directory
   - Common locations:
     - `/var/www/html/clippy/`
     - `/home/user/clippy/dist/spa/`
     - `/opt/clippy/dist/spa/`

3. Copy the demo files to the web root:
```bash
# On VPS
sudo mkdir -p /var/www/clippy
sudo cp /path/to/clippy/dist/spa/demo*.html /var/www/clippy/
sudo cp /path/to/clippy/dist/spa/demo*.js /var/www/clippy/
sudo cp -r /path/to/clippy/dist/spa/assets /var/www/clippy/
sudo chown -R www-data:www-data /var/www/clippy
```

4. Test nginx config:
```bash
sudo nginx -t
```

5. Reload nginx:
```bash
sudo systemctl reload nginx
```

### Option 2: Serve Demo from Node.js App

Add routes to your Express server to serve the demo files:

```javascript
// In your server/index.js or app.js
const express = require('express');
const path = require('path');

// Serve demo files
app.get('/demo.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/spa/demo.html'));
});

app.get('/demo-video.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/spa/demo-video.html'));
});
```

### Option 3: Hash-based Route (No Server Changes)

Access the demo via hash route that the SPA handles:
- https://useclippy.com/#demo

The app would need to be updated to show the modal when the hash is #demo.

## Quick Test

After deploying, test:
```bash
curl -I https://useclippy.com/demo.html
curl -I https://useclippy.com/demo-video.html
```

Should return 200 OK with HTML content type.

## Files to Deploy

1. `/dist/spa/demo.html` - Demo page wrapper
2. `/dist/spa/demo-video.html` - Interactive demo presentation  
3. `/dist/spa/demo-modal.js` - Modal functionality
4. `/dist/spa/demo-route.js` - Hash route handler
5. Updated `nginx-clippy.conf` - Nginx configuration

## Where is your app currently deployed?

Please let me know:
- Path to your app on the VPS (e.g., `/var/www/clippy/`, `/home/user/clippy/`)
- What user the app runs as
- Current nginx config location

I can then provide exact commands to run.
