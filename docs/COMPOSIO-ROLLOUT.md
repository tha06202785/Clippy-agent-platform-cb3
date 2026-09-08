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

## Approved WhatsApp replies

The reply service executes `WHATSAPP_SEND_MESSAGE` against the encrypted
connected-account reference and pins toolkit version `20260815_00`. It checks
that the account belongs to a current agency member and that the selected
sender is still a verified number on that account. Provider access tokens never
need to be copied into Clippy. A reply is accepted only when the provider
returns a message ID; failed or timed-out sends are not automatically retried.

The callback and **Test connection** use `WHATSAPP_GET_PHONE_NUMBERS` to discover
sender numbers. One verified number is selected automatically. Multiple
numbers require an explicit selection in Connections. A vanished saved number
is never silently replaced. Sender selection also creates the phone-to-agency
mapping used by Clippy's existing Meta webhook.

Connections reports sending readiness separately from receiving proof. OAuth
alone no longer marks this integration healthy. Health tests preserve indexed
item counts and update the existing agency/provider record.

## Incoming enquiries and provider limitation

As verified on 8 September 2026, Composio's WhatsApp catalog lists only
`WHATSAPP_MESSAGE_STATUS_UPDATED_TRIGGER`. Its detailed description explicitly
states that it cannot poll WhatsApp and returns empty results. Do not provision
this trigger as an incoming-message integration.

Incoming enquiries and receipts require the Meta webhook at
`/api/webhooks/whatsapp`, signed by the Meta app whose subscription delivers
those events. Composio-managed OAuth does not expose that shared app's signing
secret. Do not weaken signature verification to make its events pass or
subscribe an unverified callback. A compatible Meta app subscription must be
configured before incoming enquiries can be proven. A valid incoming message
sets the receiving proof only after successful persistence. Failed saves
return HTTP 500 for provider retry; invalid signatures return HTTP 401, and
ambiguous phone-to-agency mappings are rejected.

Free-form replies still require Meta's active customer-service window.
Template approval/sending and a real delivery/read-receipt proof remain pilot
gates; this release does not activate unattended WhatsApp automation.

References: [WhatsApp toolkit](https://docs.composio.dev/toolkits/whatsapp),
[WhatsApp integration guide](https://docs.composio.dev/kb/guide/toolkits-whatsapp),
[tool execution API](https://docs.composio.dev/reference/api-reference/tools/postToolsExecuteByToolSlug).

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
