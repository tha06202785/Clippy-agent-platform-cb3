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
      console.log("⚠️  No organization found. Creating one...\n");
      orgId = "default-org"; // You'll need to use your actual org_id
    }

    // Step 2: Get or create default user
    console.log("👤 Setting up user...");
    
    let userId: string;
    const { data: existingUsers } = await supabase
      .from("profiles")
      .select("user_id")
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      userId = existingUsers[0].user_id;
      console.log(`✅ Using existing user: ${userId}\n`);
    } else {
      // For demo, we'll use a hardcoded UUID
      userId = "550e8400-e29b-41d4-a716-446655440000";
      
      const { error: userError } = await supabase
        .from("profiles")
        .insert([
          {
            user_id: userId,
            full_name: "Demo Agent",
            phone: "+61 2 1234 5678",
            avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=DemoAgent",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (userError && userError.code !== "23505") {
        console.error("❌ Error creating user:", userError);
      } else {
        console.log(`✅ Created/verified user: ${userId}\n`);
      }
    }

    // Step 3: Seed Listings
    console.log("🏠 Adding sample listings...");
    const listings = [
      {
        org_id: orgId,
        address: "123 Oak Street, Darling Point NSW 2027",
        price: 1200000,
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        address: "456 Maple Avenue, Bondi NSW 2026",
        price: 1800000,
        status: "active",
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        address: "789 Pine Road, Neutral Bay NSW 2089",
        price: 650000,
        status: "active",
        created_at: new Date().toISOString(),
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
        primary_channel: "facebook",
        source: "facebook",
        buyer_type: "upsizer",
        notes: "Very interested in modern homes with ocean views",
        assigned_to_user_id: userId,
        last_contact_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        full_name: "Michael Chen",
        email: "mchen@example.com",
        phone: "+61 2 5552 5678",
        status: "new",
        stage: "prospect",
        primary_channel: "website",
        source: "website",
        buyer_type: "first_home_buyer",
        notes: "First-time buyer, looking for investment properties",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        full_name: "Jessica Martinez",
        email: "j.martinez@example.com",
        phone: "+61 2 5553 9999",
        status: "qualified",
        stage: "hot",
        primary_channel: "referral",
        source: "referral",
        buyer_type: "relocator",
        notes: "Relocating from overseas, needs 4BR minimum, ready to move",
        assigned_to_user_id: userId,
        last_contact_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        org_id: orgId,
        full_name: "Emma Thompson",
        email: "emma.t@example.com",
        phone: "+61 2 5554 4444",
        status: "new",
        stage: "warm",
        primary_channel: "facebook",
        source: "facebook",
        buyer_type: "investor",
        notes: "Good credit, pre-approved loan, looking for rental investment",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
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
        lead_id: leadsData?.[0]?.id || "00000000-0000-0000-0000-000000000001",
        type: "follow_up_24h",
        title: "Follow up with Sarah Johnson",
        description: "Check interest in 123 Oak Street listing",
        due_at: new Date(Date.now() + 3600000).toISOString(),
        status: "pending",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        lead_id: leadsData?.[1]?.id || "00000000-0000-0000-0000-000000000002",
        listing_id: listingsData?.[0]?.id,
        type: "post_facebook",
        title: "Post 456 Maple Avenue to Facebook",
        description: "Schedule luxury property listing post",
        due_at: new Date(Date.now() + 7200000).toISOString(),
        status: "pending",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        lead_id: leadsData?.[2]?.id || "00000000-0000-0000-0000-000000000003",
        type: "schedule_showing",
        title: "Schedule showing for Jessica Martinez",
        description: "Tuesday 2pm at 456 Maple Avenue",
        due_at: new Date(Date.now() + 86400000).toISOString(),
        status: "pending",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        lead_id: leadsData?.[1]?.id || "00000000-0000-0000-0000-000000000002",
        type: "send_contract",
        title: "Send contract to Michael Chen",
        description: "Downtown condo offer accepted",
        due_at: new Date(Date.now() + 172800000).toISOString(),
        status: "pending",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        lead_id: leadsData?.[3]?.id || "00000000-0000-0000-0000-000000000004",
        type: "call",
        title: "Call Emma Thompson",
        description: "Discuss financing options",
        due_at: new Date(Date.now() + 3600000).toISOString(),
        status: "pending",
        assigned_to_user_id: userId,
        created_at: new Date().toISOString(),
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

    console.log("🎉 Database seeding complete!");
    console.log("\n✅ Your dashboard should now show real data without demo mode banner.");
    console.log("📊 Refresh your browser to see the changes!\n");
  } catch (error) {
    console.error("❌ Unexpected error during seeding:", error);
    process.exit(1);
  }
}

seedDatabase();
