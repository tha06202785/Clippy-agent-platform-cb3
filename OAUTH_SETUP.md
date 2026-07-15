# OAuth Integration Setup Guide

## Google OAuth (Gmail + Calendar)

1. Go to https://console.cloud.google.com
2. Create a project or select existing
3. Go to APIs & Services → OAuth consent screen
4. Set User Type = External, fill in app name "Clippy"
5. Add scopes: .../auth/gmail.modify, .../auth/calendar.events
6. Add test users (your email)
7. Go to Credentials → Create Credentials → OAuth client ID
8. Application type = Web application
9. Add Authorized redirect URI:
   https://useclippy.com/api/integrations/google/callback
10. Copy Client ID and Client Secret
11. Run: vercel env add GOOGLE_CLIENT_ID (paste value)
12. Run: vercel env add GOOGLE_CLIENT_SECRET (paste value)

## Facebook OAuth (Messenger)

1. Go to https://developers.facebook.com
2. Create a new app → Business → Next
3. Add Messenger product
4. Go to Settings → Basic
5. Copy App ID → vercel env add FACEBOOK_APP_ID
6. Copy App Secret → vercel env add FACEBOOK_ACCESS_TOKEN
7. Go to Messenger Settings → Webhooks
8. Add callback URL: https://useclippy.com/api/integrations/facebook/callback
9. Verify token: clippy-fb-verify-2026
10. Subscribe to: messages, messaging_postbacks
11. Go to Products → Messenger → Settings → Access Tokens
12. Generate a Page Access Token for your business page
