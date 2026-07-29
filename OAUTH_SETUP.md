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
11. In Vercel → Clippy → Settings → Environment Variables, add
    `GOOGLE_CLIENT_ID` to Production. Paste only the value ending in
    `.apps.googleusercontent.com` — do not paste the variable name, quotes, or
    the `GOCSPX-...` client secret.
12. Add `GOOGLE_CLIENT_SECRET` to Production. Paste only the client secret.
13. Confirm `NEXT_PUBLIC_APP_URL=https://useclippy.com` in Production.
14. Redeploy the latest `main` deployment after saving the variables.

For a Preview deployment, add the same credentials to Preview and set
`NEXT_PUBLIC_APP_URL` to a stable preview or branch alias. Add that exact
`https://.../api/integrations/google/callback` URL in Google Cloud as another
Authorized redirect URI before testing.

`Error 401: invalid_client` happens before Clippy's callback. It means
`GOOGLE_CLIENT_ID` is not a current Google OAuth Web application client ID
(commonly the secret was pasted into the ID field, quotes were included, or
the credential was deleted in Google Cloud).

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
