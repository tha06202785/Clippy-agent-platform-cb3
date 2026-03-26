# Clippy Deployment Guide
## Production Deployment - April 1, 2026

---

## 🚀 Quick Deploy (Production)

### Option 1: Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd client
vercel --prod
```

**Environment Variables to set in Vercel:**
```
VITE_SUPABASE_URL=https://mqydieqeybgxtjqogrwh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeWRpZXFleWJneHRqcW9ncndoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Mzk4NjQsImV4cCI6MjA4NzQxNTg2NH0.jB8Uq9ClaPF4fQaXOYCZ7uhaGsYEX2qt3C2R-8zn_PE
VITE_API_URL=https://api.useclippy.com
```

### Option 2: Deploy Backend API

```bash
# Install PM2
npm i -g pm2

# Start webhook server
pm2 start webhook_handler.py --name clippy-webhooks --interpreter python3

# Start background worker
pm2 start background_worker.py --name clippy-worker --interpreter python3

# Save PM2 config
pm2 save
pm2 startup
```

---

## 📋 System Requirements

### Server Specs (Minimum)
- **CPU:** 2 cores
- **RAM:** 4GB
- **Disk:** 20GB
- **OS:** Ubuntu 22.04 LTS
- **Node:** 18+
- **Python:** 3.10+

### Required Ports
- `3000` - Frontend (dev)
- `5001` - Webhook server
- `8765` - WebSocket (optional)

---

## 🔧 Environment Setup

### 1. Database (Supabase)
**Already configured ✅**
- URL: https://mqydieqeybgxtjqogrwh.supabase.co
- Tables: 14 created
- RLS: Enabled

### 2. AI (OpenAI)
**API Key configured ✅**
- Model: GPT-4
- Voice: Whisper

### 3. Integrations (Optional)
```bash
# Facebook (optional)
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_token

# Make.com (optional)
MAKE_WEBHOOK_SECRET=your_secret
```

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Agent Phone   │
└────────┬────────┘
         │
┌────────▼────────┐
│   Vercel CDN    │
│   (Frontend)    │
└────────┬────────┘
         │
┌────────▼────────┐
│   API Server    │
│   (Python/Flask)│
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase      │
│   (PostgreSQL)  │
└─────────────────┘
```

---

## ✅ Deployment Checklist

### Pre-Deploy
- [ ] All tests pass
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL certificate ready

### Deploy
- [ ] Deploy frontend
- [ ] Deploy backend
- [ ] Configure webhooks
- [ ] Test end-to-end

### Post-Deploy
- [ ] Monitor logs
- [ ] Check error rates
- [ ] Verify SSL
- [ ] Test signup flow

---

## 🐛 Troubleshooting

### Issue: Webhooks not receiving
**Fix:** Check firewall, ensure port 5001 open

### Issue: Database connection failed
**Fix:** Verify Supabase URL and key

### Issue: AI not responding
**Fix:** Check OpenAI API key, ensure credits

---

## 📞 Support

**Emergency:** Check integration logs
```bash
tail -f /var/log/clippy/webhooks.log
```

**Documentation:** https://docs.useclippy.com

---

**Deployment Version:** 1.0.0  
**Last Updated:** March 22, 2026
