# Composio rollout for Clippy

## Decision

Use Composio as an optional integration adapter, beginning with WhatsApp
Business. Keep Clippy's direct Google, Microsoft, Meta, Stripe, Supabase and
authentication implementations intact. This gives the pilot a faster
WhatsApp onboarding path without making core infrastructure dependent on one
integration vendor.

## WhatsApp connection flow

1. An authenticated agent selects **Connect WhatsApp Business**.
2. If Composio is configured, Clippy creates a short-lived Connect Link for a
   pseudonymous, organisation-scoped user ID. Otherwise, Clippy retains the
   direct Meta Embedded Signup flow.
3. Composio returns to Clippy's callback with the connected-account ID.
4. Clippy verifies the signed browser state, current user, account ownership,
   toolkit and active status with Composio.
5. Clippy stores only an encrypted Composio account reference. Provider access
   tokens remain with Composio.
6. The Connections page shows which route manages the connection and supports
   a live account-health test.

## Required production variables

```text
COMPOSIO_API_KEY
COMPOSIO_WHATSAPP_AUTH_CONFIG_ID
COMPOSIO_FOLLOW_UP_BOSS_AUTH_CONFIG_ID
INTEGRATION_ENCRYPTION_KEY
NEXT_PUBLIC_APP_URL=https://useclippy.com
```

Create the WhatsApp auth configuration in the Composio project before setting
the variables. The API key must be server-only and must never use a
`NEXT_PUBLIC_` prefix.

## Pilot gates

Do not enable unattended WhatsApp automation merely because OAuth succeeds.
The first connected pilot account must pass all of these checks:

- WhatsApp Business account connection and reconnection
- correct phone-number selection
- inbound webhook delivery and replay protection
- approved free-form reply inside Meta's service window
- approved template message outside the service window
- delivered/read/failed status updates
- Clippy conversation and contact matching
- human approval before the first reply, booking, marketing or negotiation

## Next connectors

After the WhatsApp delivery proof, evaluate Composio for external systems that
Clippy does not already integrate well: HubSpot, Google Drive, Dropbox and
e-signature tools. Keep Outlook on the existing direct Microsoft Graph
implementation unless the production proof demonstrates a clear reliability or
onboarding advantage.

## Follow Up Boss connection foundation

Follow Up Boss is available in the Connections screen through the shared
Composio callback and account-verification flow. It requires a custom Composio
auth config because Composio does not provide a managed Follow Up Boss app.

Set `COMPOSIO_FOLLOW_UP_BOSS_AUTH_CONFIG_ID` after creating either an OAuth2 or
API-key auth config in the Composio project. Clippy stores only the encrypted
connected-account reference. CRM reads, imports, and writes remain disabled in
this release so a connection cannot silently alter an agency's CRM.
