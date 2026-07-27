import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Step 1: Get or create default organization
    console.log("📦 Setting up organization...");
    
    let orgId: string;
    const { data: existingOrgs } = await supabase
      .from("orgs")
      .select("id")
      .limit(1);

    if (existingOrgs && existingOrgs.length > 0) {
      orgId = existingOrgs[0].id;
      console.log(`✅ Using existing organization: ${orgId}\n`);
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from("orgs")
        .insert([
          {
            name: "Acme Real Estate",
            slug: "acme-real-estate",
            plan: "pro",
            market_code: "AU",
            timezone: "Australia/Sydney",
            status: "active",
          },
        ])
        .select()
        .single();

      if (orgError) {
        console.error("❌ Error creating organization:", orgError);
        return;
      }

      orgId = newOrg.id;
      console.log(`✅ Created organization: ${orgId}\n`);
    }

    // Step 2: Get or create default user
    console.log("👤 Setting up user...");
    
    let userId: string;
    const { data: existingUsers } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`✅ Using existing user: ${userId}\n`);
    } else {
      // For demo, we'll use a hardcoded UUID
      userId = "550e8400-e29b-41d4-a716-446655440000";
      
      const { error: userError } = await supabase
        .from("profiles")
        .insert([
          {
            id: userId,
            full_name: "Demo Agent",
            email: "agent@acmerealestate.com",
            phone: "+61 2 1234 5678",
            bio: "Experienced real estate agent",
          },
        ]);

      if (userError && userError.code !== "23505") {
        // Ignore unique constraint violations
        console.error("❌ Error creating user:", userError);
      } else {
        console.log(`✅ Created user: ${userId}\n`);
      }
    }

    // Step 3: Seed Listings
    console.log("🏠 Adding sample listings...");
    const listings = [
      {
        org_id: orgId,
        agent_user_id: userId,
        status: "active",
        type: "sale",
        address: "123 Oak Street",
        suburb: "Darling Point",
        state: "NSW",
        postcode: "2027",
        country: "AU",
        price_display: "$1,200,000",
        price_min: 1200000,
        price_max: 1200000,
        bedrooms: 3,
        bathrooms: 2,
        carspaces: 1,
        features_json: ["Hardwood floors", "Updated kitchen", "Backyard", "Garden shed"],
        description_raw: "Beautiful Victorian-style home in desirable neighbourhood",
        published_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        agent_user_id: userId,
        status: "active",
        type: "sale",
        address: "456 Maple Avenue",
        suburb: "Bondi",
        state: "NSW",
        postcode: "2026",
        country: "AU",
        price_display: "$1,800,000",
        price_min: 1800000,
        price_max: 1800000,
        bedrooms: 4,
        bathrooms: 3,
        carspaces: 2,
        features_json: ["Pool", "Smart home", "Master suite", "Gated entry"],
        description_raw: "Modern luxury home with premium finishes and ocean views",
        published_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        agent_user_id: userId,
        status: "active",
        type: "sale",
        address: "789 Pine Road",
        suburb: "Neutral Bay",
        state: "NSW",
        postcode: "2089",
        country: "AU",
        price_display: "$650,000",
        price_min: 650000,
        price_max: 650000,
        bedrooms: 2,
        bathrooms: 1,
        carspaces: 1,
        features_json: ["City views", "Modern kitchen", "In-unit laundry"],
        description_raw: "Downtown condo with stunning skyline views",
        published_at: new Date().toISOString(),
      },
    ];

    const { data: listingsData, error: listingsError } = await supabase
      .from("listings")
      .insert(listings)
      .select();

    if (listingsError) {
      console.error("❌ Error inserting listings:", listingsError);
    } else {
      console.log(`✅ Added ${listingsData?.length || 0} listings\n`);
    }

    // Step 4: Seed Leads
    console.log("👥 Adding sample leads...");
    const leads = [
      {
        org_id: orgId,
        full_name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        phone: "+61 2 5551 1234",
        status: "contacted",
        stage: "warm",
        temperature: "hot",
        buyer_type: "upsizer",
        budget_min: 1000000,
        budget_max: 1500000,
        preferred_suburbs: ["Darling Point", "Bondi", "Neutral Bay"],
        primary_channel: "facebook",
        source: "facebook",
        assigned_to_user_id: userId,
        notes: "Very interested in modern homes with ocean views",
        last_contact_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        full_name: "Michael Chen",
        email: "mchen@example.com",
        phone: "+61 2 5552 5678",
        status: "new",
        stage: "prospect",
        temperature: "warm",
        buyer_type: "first_home_buyer",
        budget_min: 600000,
        budget_max: 800000,
        preferred_suburbs: ["Neutral Bay", "Cremorne"],
        primary_channel: "website",
        source: "website",
        assigned_to_user_id: userId,
        notes: "First-time buyer, looking for investment properties",
      },
      {
        org_id: orgId,
        full_name: "Jessica Martinez",
        email: "j.martinez@example.com",
        phone: "+61 2 5553 9999",
        status: "qualified",
        stage: "hot",
        temperature: "hot",
        buyer_type: "relocator",
        budget_min: 1500000,
        budget_max: 2000000,
        preferred_suburbs: ["Bondi", "Coogee", "Tamarama"],
        primary_channel: "referral",
        source: "referral",
        assigned_to_user_id: userId,
        notes: "Relocating from overseas, needs 4BR minimum, ready to move",
        last_contact_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        org_id: orgId,
        full_name: "Emma Thompson",
        email: "emma.t@example.com",
        phone: "+61 2 5554 4444",
        status: "new",
        stage: "warm",
        temperature: "warm",
        buyer_type: "investor",
        budget_min: 800000,
        budget_max: 1200000,
        preferred_suburbs: ["Neutral Bay", "Pymble"],
        primary_channel: "facebook",
        source: "facebook",
        assigned_to_user_id: userId,
        notes: "Good credit, pre-approved loan, looking for rental investment",
      },
    ];

    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .insert(leads)
      .select();

    if (leadsError) {
      console.error("❌ Error inserting leads:", leadsError);
    } else {
      console.log(`✅ Added ${leadsData?.length || 0} leads\n`);
    }

    // Step 5: Seed Tasks
    console.log("✓ Adding sample tasks...");
    const tasks = [
      {
        org_id: orgId,
        lead_id: leadsData?.[0]?.id,
        type: "follow_up_24h",
        title: "Follow up with Sarah Johnson",
        description: "Check interest in 123 Oak Street listing",
        due_at: new Date(Date.now() + 3600000).toISOString(),
        status: "pending",
        priority: "high",
        assigned_to_user_id: userId,
      },
      {
        org_id: orgId,
        listing_id: listingsData?.[0]?.id,
        type: "post_facebook",
        title: "Post 456 Maple Avenue to Facebook",
        description: "Schedule luxury property listing post",
        due_at: new Date(Date.now() + 7200000).toISOString(),
        status: "pending",
        priority: "medium",
        assigned_to_user_id: userId,
      },
      {
        org_id: orgId,
        lead_id: leadsData?.[2]?.id,
        type: "schedule_showing",
        title: "Schedule showing for Jessica Martinez",
        description: "Tuesday 2pm at 456 Maple Avenue",
        due_at: new Date(Date.now() + 86400000).toISOString(),
        status: "pending",
        priority: "high",
        assigned_to_user_id: userId,
      },
      {
        org_id: orgId,
        lead_id: leadsData?.[1]?.id,
        type: "send_contract",
        title: "Send contract to Michael Chen",
        description: "Downtown condo offer accepted",
        due_at: new Date(Date.now() + 172800000).toISOString(),
        status: "pending",
        priority: "high",
        assigned_to_user_id: userId,
      },
    ];

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .insert(tasks)
      .select();

    if (tasksError) {
      console.error("❌ Error inserting tasks:", tasksError);
    } else {
      console.log(`✅ Added ${tasksData?.length || 0} tasks\n`);
    }

    // Step 6: Seed Integrations
    console.log("🔌 Adding integration status...");
    const integrations = [
      {
        org_id: orgId,
        provider: "facebook_pages",
        status: "connected",
        settings_json: {
          page_id: "123456789",
          page_name: "Acme Real Estate",
        },
        webhook_url: "https://useclippy.com/api/webhooks/facebook",
        webhook_events: ["messages", "messaging_postbacks"],
        connected_by_user_id: userId,
        connected_at: new Date(Date.now() - 2592000000).toISOString(),
      },
      {
        org_id: orgId,
        provider: "whatsapp_business",
        status: "connected",
        settings_json: {
          phone_number_id: "987654321",
        },
        webhook_url: "https://useclippy.com/api/webhooks/whatsapp",
        connected_by_user_id: userId,
        connected_at: new Date(Date.now() - 1209600000).toISOString(),
      },
      {
        org_id: orgId,
        provider: "mailgun",
        status: "connected",
        settings_json: {
          domain: "acmerealestae.com",
        },
        webhook_url: "https://useclippy.com/api/webhooks/email",
        connected_by_user_id: userId,
        connected_at: new Date(Date.now() - 604800000).toISOString(),
      },
    ];

    const { data: integrationsData, error: integrationsError } = await supabase
      .from("integrations")
      .insert(integrations)
      .select();

    if (integrationsError) {
      console.error("❌ Error inserting integrations:", integrationsError);
    } else {
      console.log(`✅ Added ${integrationsData?.length || 0} integrations\n`);
    }

    console.log("🎉 Database seeding complete!");
    console.log("\n✅ Your dashboard should now show real data without demo mode banner.");
    console.log("📊 Refresh your browser to see the changes!\n");
  } catch (error) {
    console.error("❌ Unexpected error during seeding:", error);
    process.exit(1);
  }
}

seedDatabase();
