# Clippy Widget Integration Guide

## Overview
The Clippy Widget is now integrated into the main platform and can be embedded on any website.

## Files Added

### Frontend
- `/client/pages/WidgetEmbed.tsx` - Widget configuration page at `/widget`
- `/public/clippy-widget.js` - Embeddable widget script

### Backend
- `/server/api_server.py` - Added `/api/widget/chat` endpoint

### Deployment
- `/deploy-widget-vps.sh` - VPS deployment script
- `/WIDGET_INTEGRATION.md` - This file

## URL Structure

Once deployed to useclippy.com:

| URL | Description |
|-----|-------------|
| `https://useclippy.com/widget` | Widget configuration page |
| `https://useclippy.com/clippy-widget.js` | Widget script (embeddable) |
| `https://useclippy.com/api/widget/chat` | Chat API endpoint |

## Embed Code for Users

```html
<script src="https://useclippy.com/clippy-widget.js"
    data-position="bottom-right"
    data-theme="blue"
    data-welcome="Hi! I'm Clippy. How can I help you today?"
    data-title="Clippy Assistant"
    data-api-endpoint="https://useclippy.com/api/widget/chat">
</script>
```

## Quick Deployment

```bash
# From project root
./deploy-widget-vps.sh
```

This will:
1. Build the React frontend
2. Set up Python backend
3. Create deployment package
4. Deploy to VPS (optional)

## Nginx Configuration

The widget requires special Nginx configuration for CORS:

```nginx
# Widget endpoint (public, CORS enabled)
location /api/widget/chat {
    proxy_pass http://127.0.0.1:5000/api/widget/chat;
    
    # CORS headers
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type' always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}

# Widget JavaScript
location /clippy-widget.js {
    alias /var/www/clippy/frontend/clippy-widget.js;
    add_header Content-Type "application/javascript";
}
```

## Testing

After deployment:

1. Visit `https://useclippy.com/widget` to configure
2. Copy embed code
3. Test on a simple HTML page
4. Verify chat bubble appears
5. Test chat functionality

## Customization

Users can customize via data attributes:

- `data-position`: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- `data-theme`: `blue`, `green`, `purple`, `orange`, `dark`
- `data-welcome`: Welcome message text
- `data-title`: Widget title
- `data-width`: Chat window width (default: 350)
- `data-height`: Chat window height (default: 500)

## API Rate Limits

Consider implementing rate limiting on `/api/widget/chat`:
- 100 requests per IP per hour (suggested)
- 10 requests per session per minute (suggested)

## Security Notes

- Widget endpoint is public (no auth required)
- No user data is stored from widget chats
- OpenAI API calls are logged for monitoring
- Consider adding reCAPTCHA for spam protection