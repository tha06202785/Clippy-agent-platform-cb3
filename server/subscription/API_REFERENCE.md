# Subscription API Reference

Complete API documentation for the Stripe subscription system.

## Authentication

All endpoints (except webhooks) require Bearer token authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### Subscription Management

#### Create Checkout Session
```http
POST /api/subscription/create-checkout
```

Create a Stripe Checkout session for subscription purchase.

**Request Body:**
```json
{
  "tier": "pro"  // "pro" or "enterprise"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "tier": "pro",
  "price": 29
}
```

**Errors:**
- `INVALID_TIER` - Invalid tier specified
- `ALREADY_SUBSCRIBED` - User already has an active subscription for this tier

---

#### Get Subscription Status
```http
GET /api/subscription/status
```

Get current subscription status and plan details.

**Response:**
```json
{
  "tier": "pro",
  "plan": {
    "name": "Pro",
    "price": 29,
    "description": "Professional tier for power users",
    "features": [
      "500 leads per month",
      "Unlimited AI calls",
      "All features",
      "Priority support"
    ],
    "limits": {
      "leads": 500,
      "ai_calls": -1,
      "emails_sent": 5000,
      "storage_mb": 1000
    }
  },
  "subscription": {
    "status": "active",
    "tier": "pro",
    "currentPeriodStart": "2024-01-01T00:00:00Z",
    "currentPeriodEnd": "2024-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "availableTiers": [
    {
      "tier": "free",
      "name": "Free",
      "price": 0,
      "description": "Free tier with basic features"
    },
    {
      "tier": "pro",
      "name": "Pro",
      "price": 29,
      "description": "Professional tier for power users"
    },
    {
      "tier": "enterprise",
      "name": "Enterprise",
      "price": "custom",
      "description": "Enterprise tier with custom limits"
    }
  ]
}
```

---

#### Create Billing Portal
```http
POST /api/subscription/portal
```

Create Stripe Customer Portal session for managing billing.

**Response:**
```json
{
  "success": true,
  "url": "https://billing.stripe.com/session/..."
}
```

**Errors:**
- `NO_CUSTOMER` - No billing account found

---

#### Cancel Subscription
```http
POST /api/subscription/cancel
```

Cancel subscription (at period end or immediately).

**Request Body:**
```json
{
  "immediate": false  // true = cancel now, false = at period end
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will cancel at end of billing period",
  "cancelAt": "2024-02-01T00:00:00Z",
  "immediate": false
}
```

**Errors:**
- `NO_SUBSCRIPTION` - No active subscription found
- `FREE_TIER` - Cannot cancel free tier

---

#### Resume Subscription
```http
POST /api/subscription/resume
```

Resume a subscription that was set to cancel at period end.

**Response:**
```json
{
  "success": true,
  "message": "Subscription resumed"
}
```

---

#### Change Tier
```http
POST /api/subscription/change-tier
```

Change subscription tier (upgrade/downgrade).

**Request Body:**
```json
{
  "tier": "enterprise"
}
```

**Response (Upgrade):**
```json
{
  "success": true,
  "message": "Upgraded from Pro to Enterprise",
  "tier": "enterprise",
  "prorationDate": "2024-01-15T00:00:00Z"
}
```

**Response (Checkout Required):**
```json
{
  "action": "checkout_required",
  "message": "Please complete checkout to upgrade",
  "checkoutEndpoint": "/api/subscription/create-checkout",
  "tier": "pro"
}
```

---

### Usage & Billing

#### Get Usage Stats
```http
GET /api/subscription/usage
```

Get current usage statistics.

**Response:**
```json
{
  "tier": "pro",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-02-01T00:00:00Z"
  },
  "usage": {
    "leads": 150,
    "ai_calls": 450,
    "emails_sent": 1200,
    "storage_mb": 450
  },
  "limits": {
    "leads": 500,
    "ai_calls": -1,
    "emails_sent": 5000,
    "storage_mb": 1000
  },
  "percentages": {
    "leads": 30,
    "ai_calls": 0,
    "emails_sent": 24,
    "storage_mb": 45
  },
  "warnings": [
    {
      "metric": "leads",
      "percentage": 90,
      "severity": "warning"
    }
  ],
  "isUnlimited": false
}
```

---

#### Get Billing History
```http
GET /api/subscription/billing-history?limit=10&offset=0
```

Get billing/invoice history.

**Response:**
```json
{
  "history": [
    {
      "id": "...",
      "stripe_invoice_id": "in_...",
      "amount": 2900,
      "amountFormatted": "$29.00",
      "currency": "usd",
      "status": "paid",
      "description": "Subscription payment",
      "invoice_pdf": "https://pay.stripe.com/invoice/acct_.../.../pdf",
      "hosted_invoice_url": "https://invoice.stripe.com/i/...",
      "date": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

---

### Usage-Limited Operations

#### Create Lead
```http
POST /api/subscription/leads
```

Create a new lead (enforces leads limit).

**Response:**
```json
{
  "success": true,
  "message": "Lead created",
  "usage": {
    "metric": "leads",
    "used": 51,
    "limit": 50,
    "tier": "free",
    "remaining": 0,
    "percentage": 102
  }
}
```

**Error (Limit Exceeded):**
```json
{
  "error": "Monthly leads limit exceeded",
  "code": "USAGE_LIMIT_EXCEEDED",
  "currentTier": "free",
  "limit": 50,
  "usage": 50,
  "upgrade": {
    "available": true,
    "nextTier": "pro",
    "url": "/subscription/upgrade"
  },
  "message": "You've reached your free plan limit of 50 leads per month. Upgrade to unlock more."
}
```

---

#### AI Generate
```http
POST /api/subscription/ai/generate
```

Make AI call (enforces ai_calls limit).

---

#### Send Email
```http
POST /api/subscription/emails/send
```

Send email (enforces emails_sent limit).

---

### Feature-Restricted Endpoints

#### API Access
```http
POST /api/subscription/external/webhook
```

Receive external webhook (Pro+ only).

**Error (Not Available):**
```json
{
  "error": "api_access requires Pro plan",
  "code": "FEATURE_NOT_AVAILABLE",
  "feature": "api_access",
  "currentTier": "free",
  "requiredTier": "pro",
  "upgradeUrl": "/subscription/upgrade"
}
```

---

#### Custom Branding
```http
GET /api/subscription/branding/custom
```

Get custom branding settings (Pro+ only).

---

#### Priority Support
```http
POST /api/subscription/support/priority
```

Create priority support ticket (Pro+ only).

---

#### Enterprise Operations
```http
POST /api/subscription/admin/bulk-operation
```

Perform bulk operation (Enterprise only).

**Error (Tier Too Low):**
```json
{
  "error": "This feature requires enterprise plan or higher",
  "code": "TIER_TOO_LOW",
  "currentTier": "pro",
  "requiredTier": "enterprise",
  "upgradeUrl": "/subscription/upgrade"
}
```

---

### Webhooks (Stripe → Server)

#### Stripe Webhook
```http
POST /webhooks/stripe
```

Handle Stripe webhook events. Raw body required for signature verification.

**Events Handled:**
- `checkout.session.completed` - Subscription created
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription ended
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

**Security:** Signature verified using `STRIPE_WEBHOOK_SECRET`

---

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication token missing or invalid |
| `NO_SUBSCRIPTION` | No active subscription found |
| `NO_CUSTOMER` | No Stripe customer exists |
| `INVALID_TIER` | Invalid tier specified |
| `ALREADY_SUBSCRIBED` | User already has this tier |
| `FREE_TIER` | Cannot perform action on free tier |
| `USAGE_LIMIT_EXCEEDED` | Monthly limit reached |
| `FEATURE_NOT_AVAILABLE` | Feature not included in current tier |
| `TIER_TOO_LOW` | Requires higher tier |
| `CHECKOUT_ERROR` | Stripe checkout failed |
| `STRIPE_ERROR` | Stripe API error |
| `STRIPE_UPDATE_ERROR` | Failed to update Stripe subscription |

---

## Plan Limits

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Leads/Month | 50 | 500 | Unlimited |
| AI Calls/Month | 100 | Unlimited | Unlimited |
| Emails/Month | 500 | 5,000 | Unlimited |
| Storage | 100MB | 1GB | Unlimited |
| API Access | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| Dedicated Support | ❌ | ❌ | ✅ |

---

## Usage Headers

When approaching limits, the API adds warning headers:

```
X-Usage-Warning: leads: 85% of limit used
```

---

## Rate Limits

- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 10 requests per 15 minutes per IP
