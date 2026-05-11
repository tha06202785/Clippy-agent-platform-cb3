import { RequestHandler } from "express";
import { createServer } from "../../server";

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "AUD",
    features: {
      aiReplies: 50,
      listingsPerMonth: 5,
      facebookPosts: 10,
      leads: 100,
      support: "Community"
    }
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 29,
    currency: "AUD",
    features: {
      aiReplies: 500,
      listingsPerMonth: 25,
      facebookPosts: 50,
      leads: 500,
      support: "Email"
    }
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 79,
    currency: "AUD",
    features: {
      aiReplies: 2000,
      listingsPerMonth: 100,
      facebookPosts: 200,
      leads: 2000,
      support: "Priority"
    }
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    currency: "AUD",
    features: {
      aiReplies: "Unlimited",
      listingsPerMonth: "Unlimited",
      facebookPosts: "Unlimited",
      leads: "Unlimited",
      support: "Dedicated"
    }
  }
};

// Get available plans
export const getPlans: RequestHandler = (req, res) => {
  res.json({
    success: true,
    plans: SUBSCRIPTION_PLANS
  });
};

// Get current subscription
export const getSubscription: RequestHandler = async (req, res) => {
  try {
    const { org_id } = req.query;

    // In production, fetch from Supabase
    // For now, return mock data
    res.json({
      success: true,
      subscription: {
        plan: "free",
        status: "active",
        startDate: new Date().toISOString(),
        renewalDate: null,
        usage: {
          aiReplies: { used: 12, limit: 50 },
          listings: { used: 2, limit: 5 },
          facebookPosts: { used: 3, limit: 10 },
          leads: { used: 25, limit: 100 }
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Create checkout session (placeholder for Stripe/Apple Pay/Google Pay)
export const createCheckout: RequestHandler = async (req, res) => {
  try {
    const { plan_id, payment_method } = req.body;

    if (!SUBSCRIPTION_PLANS[plan_id]) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const plan = SUBSCRIPTION_PLANS[plan_id];

    // Placeholder for payment integration
    // In production: integrate with Stripe, Apple Pay, or Google Pay
    res.json({
      success: true,
      message: "Checkout session created",
      plan: plan,
      payment_url: `/checkout/${plan_id}`, // Frontend will handle this
      session_id: `sess_${Date.now()}`,
      status: "pending_payment"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel subscription
export const cancelSubscription: RequestHandler = async (req, res) => {
  try {
    const { org_id } = req.body;

    // Placeholder - would cancel in Stripe and update Supabase
    res.json({
      success: true,
      message: "Subscription cancelled",
      effective_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // End of billing period
      status: "cancelled"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update payment method
export const updatePaymentMethod: RequestHandler = async (req, res) => {
  try {
    const { org_id, payment_method } = req.body;

    res.json({
      success: true,
      message: "Payment method updated",
      payment_method: payment_method,
      supported_methods: ["stripe", "apple_pay", "google_pay"]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get billing history
export const getBillingHistory: RequestHandler = async (req, res) => {
  try {
    const { org_id } = req.query;

    // Placeholder - would fetch from Stripe
    res.json({
      success: true,
      invoices: [
        {
          id: "inv_001",
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: 0,
          status: "paid",
          plan: "Free",
          description: "Free tier"
        }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Track usage (called by other endpoints)
export const trackUsage: RequestHandler = async (req, res) => {
  try {
    const { org_id, type, units } = req.body;

    // Would log to usage_events table in Supabase
    res.json({
      success: true,
      tracked: { type, units, timestamp: new Date().toISOString() }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get usage stats
export const getUsageStats: RequestHandler = async (req, res) => {
  try {
    const { org_id } = req.query;

    res.json({
      success: true,
      usage: {
        aiReplies: { used: 12, limit: 50, percentage: 24 },
        listings: { used: 2, limit: 5, percentage: 40 },
        facebookPosts: { used: 3, limit: 10, percentage: 30 },
        leads: { used: 25, limit: 100, percentage: 25 }
      },
      billing_period: {
        start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
