// Facebook Webhook Handler for Netlify Functions
// Deployed at: /.netlify/functions/facebook-webhook

exports.handler = async (event, context) => {
  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "clippy-webhook-verify";
  
  // Handle GET request (webhook verification)
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters;
    const mode = params["hub.mode"];
    const token = params["hub.verify_token"];
    const challenge = params["hub.challenge"];
    
    console.log("Webhook verification request:", { mode, token, challenge });
    
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✓ Webhook verified successfully");
      return {
        statusCode: 200,
        body: challenge
      };
    } else {
      console.log("✗ Verification failed:", { mode, token, expected: VERIFY_TOKEN });
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          error: "Verification failed",
          received_token: token,
          expected: VERIFY_TOKEN 
        })
      };
    }
  }
  
  // Handle POST request (incoming webhook events)
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      console.log("Webhook event received:", JSON.stringify(body, null, 2));
      
      // Process leads from Facebook
      const leads = [];
      
      if (body.object === "page" && body.entry) {
        for (const entry of body.entry) {
          // Handle messages
          if (entry.messaging) {
            for (const msg of entry.messaging) {
              if (msg.message && msg.message.text) {
                leads.push({
                  source: "facebook_message",
                  external_id: msg.sender?.id,
                  full_name: msg.sender?.name,
                  message: msg.message.text,
                  platform: "facebook",
                  captured_at: new Date().toISOString()
                });
              }
            }
          }
          
          // Handle feed/comment changes
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === "feed" && change.value?.item === "comment") {
                leads.push({
                  source: "facebook_comment",
                  external_id: change.value.from?.id,
                  full_name: change.value.from?.name,
                  message: change.value.message,
                  post_id: change.value.post_id,
                  platform: "facebook",
                  captured_at: new Date().toISOString()
                });
              }
            }
          }
        }
      }
      
      // Forward to Make.com webhook
      const MAKE_WEBHOOK = process.env.MAKE_LEAD_WEBHOOK;
      if (MAKE_WEBHOOK && leads.length > 0) {
        for (const lead of leads) {
          try {
            await fetch(MAKE_WEBHOOK, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lead)
            });
            console.log("Lead forwarded to Make.com:", lead.full_name);
          } catch (err) {
            console.error("Failed to forward to Make.com:", err);
          }
        }
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          status: "success",
          leads_captured: leads.length 
        })
      };
      
    } catch (error) {
      console.error("Error processing webhook:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
  }
  
  return {
    statusCode: 405,
    body: "Method not allowed"
  };
};