# Clippy + Make.com Setup Guide

## Quick Setup (2 Minutes)

### Step 1: Get Your Webhook URL
1. Log into Clippy at https://useclippy.com
2. Go to Settings → Integrations
3. Copy your webhook URL: `https://hook.us2.make.com/...`

### Step 2: Import Template to Make.com
1. Go to https://www.make.com and login
2. Click **"Create a new scenario"**
3. Click **"Import Blueprint"** (or "⋮" → Import)
4. Upload the `clippy-makecom-template.json` file
5. Click **"Import"**

### Step 3: Configure Webhook
1. Click on the **Webhook** module
2. Click **"Add"** to create new webhook
3. Name: "Clippy Lead Webhook"
4. Paste your Clippy webhook URL
5. Click **"Save"**

### Step 4: Connect Facebook
1. Click on the **Facebook** module
2. Click **"Add"** next to Connection
3. Login to Facebook
4. Select your page (e.g., "Manpower-Australia")
5. Click **"Allow"**

### Step 5: Map Fields (Auto-configured)
The template auto-maps these fields:
- **Message** → Post content
- **Link** → Property URL
- **Picture** → Property image

### Step 6: Activate
1. Click **"Save"** (floppy disk icon)
2. Toggle switch to **"ON"**
3. Click **"Run once"** to test

## Test Your Setup
1. Go to Clippy
2. Create a test lead
3. Check your Facebook page
4. Post should appear automatically!

## Troubleshooting

### "Facebook won't connect"
→ Re-authorize: Click "Reconnect" in Facebook module

### "Fields not showing"
→ Send a test webhook from Clippy first to populate fields

### "Post not appearing"
→ Check Make.com execution log for errors

## Support
Stuck? Contact support with:
- Screenshot of error
- Your Clippy webhook URL
- Make.com scenario ID

---
*Template Version: 1.0*
*Last Updated: 2026-04-02*
