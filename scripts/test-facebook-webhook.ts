import * as dotenv from "dotenv";

dotenv.config();

const WEBHOOK_URL = "https://useclippy.com/api/webhooks/test";

async function testFacebookWebhook() {
  console.log("🧪 Testing Facebook Webhook Integration...\n");

  const testLeads = [
    {
      type: "facebook_message",
      leadName: "John Smith",
      leadEmail: "john.smith@example.com",
      source: "facebook",
    },
    {
      type: "facebook_message",
      leadName: "Alice Wong",
      leadEmail: "alice.wong@example.com",
      source: "facebook",
    },
    {
      type: "facebook_message",
      leadName: "Robert Johnson",
      leadEmail: "robert.j@example.com",
      source: "facebook",
    },
  ];

  for (const lead of testLeads) {
    try {
      console.log(`📤 Sending test message from ${lead.leadName}...`);
      
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(lead),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success! Lead created:`, data.lead?.id);
        console.log(`   Name: ${data.lead?.full_name}`);
        console.log(`   Email: ${data.lead?.email}`);
        console.log(`   Source: ${data.lead?.source}\n`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed:`, error, "\n");
      }
    } catch (error) {
      console.error(`❌ Error testing webhook:`, error, "\n");
    }
  }

  console.log("🎉 Webhook test complete!");
  console.log("📊 Check your dashboard to see the new leads appearing in real-time!\n");
}

testFacebookWebhook();
