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

// Get a sample user ID (you'll need to update this with a real user ID from your auth)
const SAMPLE_USER_ID = "550e8400-e29b-41d4-a716-446655440000"; // Replace with real user ID

const sampleLeads = [
  {
    full_name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    phone: "+1 (555) 123-4567",
    source: "facebook",
    status: "hot",
    interest_level: "high",
    property_interest: "3BR/2BA suburban home",
    notes: "Very interested in modern homes with open floor plans",
    assigned_to_user_id: SAMPLE_USER_ID,
  },
  {
    full_name: "Michael Chen",
    email: "mchen@example.com",
    phone: "+1 (555) 234-5678",
    source: "web",
    status: "warm",
    interest_level: "medium",
    property_interest: "Downtown condo",
    notes: "First-time buyer, looking for investment properties",
    assigned_to_user_id: SAMPLE_USER_ID,
  },
  {
    full_name: "Jessica Martinez",
    email: "j.martinez@example.com",
    phone: "+1 (555) 345-6789",
    source: "email",
    status: "hot",
    interest_level: "high",
    property_interest: "Luxury home with pool",
    notes: "Relocating from NYC, needs 4BR minimum",
    assigned_to_user_id: SAMPLE_USER_ID,
  },
  {
    full_name: "David Wilson",
    email: "d.wilson@example.com",
    phone: "+1 (555) 456-7890",
    source: "phone",
    status: "cold",
    interest_level: "low",
    property_interest: "Investment property",
    notes: "Interested in rental opportunities",
    assigned_to_user_id: SAMPLE_USER_ID,
  },
  {
    full_name: "Emma Thompson",
    email: "emma.t@example.com",
    phone: "+1 (555) 567-8901",
    source: "facebook",
    status: "warm",
    interest_level: "medium",
    property_interest: "Family home in suburbs",
    notes: "Good credit, pre-approved loan",
    assigned_to_user_id: SAMPLE_USER_ID,
  },
];

const sampleProperties = [
  {
    address: "123 Oak Street, San Francisco, CA 94102",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    price: 1200000,
    features: ["Hardwood floors", "Updated kitchen", "Backyard", "One car garage"],
    description: "Beautiful Victorian-style home in desirable neighborhood",
    listing_status: "active",
    owner_id: SAMPLE_USER_ID,
  },
  {
    address: "456 Maple Avenue, Los Angeles, CA 90001",
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2500,
    price: 1800000,
    features: ["Pool", "Smart home", "Master suite", "Gated community"],
    description: "Modern luxury home with premium finishes",
    listing_status: "active",
    owner_id: SAMPLE_USER_ID,
  },
  {
    address: "789 Pine Road, Seattle, WA 98101",
    bedrooms: 2,
    bathrooms: 1,
    sqft: 1200,
    price: 650000,
    features: ["City views", "Modern kitchen", "In-unit laundry"],
    description: "Downtown condo with stunning skyline views",
    listing_status: "active",
    owner_id: SAMPLE_USER_ID,
  },
  {
    address: "321 Elm Court, Austin, TX 78701",
    bedrooms: 5,
    bathrooms: 4,
    sqft: 3200,
    price: 950000,
    features: ["Hill country views", "Multiple living areas", "Guest house"],
    description: "Spacious family estate with separate guest house",
    listing_status: "pending",
    owner_id: SAMPLE_USER_ID,
  },
];

const sampleTasks = [
  {
    title: "Follow up with Sarah Johnson",
    type: "follow_up_24h",
    description: "Check interest in 123 Oak Street listing",
    due_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    lead_id: null,
    listing_id: null,
    assigned_to_user_id: SAMPLE_USER_ID,
    status: "pending",
  },
  {
    title: "Post 456 Maple Avenue to Facebook",
    type: "post_facebook",
    description: "Schedule luxury property listing post",
    due_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    lead_id: null,
    listing_id: null,
    assigned_to_user_id: SAMPLE_USER_ID,
    status: "pending",
  },
  {
    title: "Schedule showing for Jessica Martinez",
    type: "inspection_book",
    description: "Tuesday 2pm at 456 Maple Avenue",
    due_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    lead_id: null,
    listing_id: null,
    assigned_to_user_id: SAMPLE_USER_ID,
    status: "pending",
  },
  {
    title: "Send contract to Michael Chen",
    type: "send_contract",
    description: "Downtown condo offer accepted",
    due_at: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    lead_id: null,
    listing_id: null,
    assigned_to_user_id: SAMPLE_USER_ID,
    status: "pending",
  },
  {
    title: "Call Emma Thompson",
    type: "call",
    description: "Discuss financing options",
    due_at: new Date(Date.now() + 3600000).toISOString(),
    lead_id: null,
    listing_id: null,
    assigned_to_user_id: SAMPLE_USER_ID,
    status: "pending",
  },
];

const sampleAutomationLogs = [
  {
    type: "content_generation",
    source: "listing_generator",
    status: "success",
    message: "Generated content for 123 Oak Street",
    user_id: SAMPLE_USER_ID,
  },
  {
    type: "lead_capture",
    source: "facebook",
    status: "success",
    message: "New lead captured: Sarah Johnson from Facebook",
    user_id: SAMPLE_USER_ID,
  },
  {
    type: "social_post",
    source: "instagram",
    status: "success",
    message: "Posted property listing to Instagram",
    user_id: SAMPLE_USER_ID,
  },
  {
    type: "email_send",
    source: "email",
    status: "success",
    message: "Sent listing details to Michael Chen",
    user_id: SAMPLE_USER_ID,
  },
  {
    type: "automation",
    source: "webhook",
    status: "error",
    message: "Webhook validation failed - retrying",
    user_id: SAMPLE_USER_ID,
  },
];

const sampleIntegrationStatus = [
  {
    service_name: "facebook",
    is_connected: true,
    user_id: SAMPLE_USER_ID,
    settings: {
      page_id: "123456789",
      page_name: "Acme Real Estate",
      access_token_expires: new Date(Date.now() + 7776000000).toISOString(),
    },
    connected_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    last_sync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    service_name: "email",
    is_connected: true,
    user_id: SAMPLE_USER_ID,
    settings: {
      email: "hello@acmerealestae.com",
      imap_enabled: true,
      smtp_enabled: true,
    },
    connected_at: new Date(Date.now() - 2592000000).toISOString(),
    last_sync: new Date(Date.now() - 600000).toISOString(), // 10 min ago
  },
  {
    service_name: "calendar",
    is_connected: false,
    user_id: SAMPLE_USER_ID,
    settings: null,
    connected_at: null,
    last_sync: null,
  },
  {
    service_name: "crm",
    is_connected: true,
    user_id: SAMPLE_USER_ID,
    settings: {
      crm_type: "hubspot",
      api_key: "***",
    },
    connected_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    last_sync: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
  },
];

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Seed Leads
    console.log("📝 Adding sample leads...");
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .insert(sampleLeads)
      .select();

    if (leadsError) {
      console.error("❌ Error inserting leads:", leadsError);
    } else {
      console.log(`✅ Added ${leadsData?.length || 0} leads\n`);
    }

    // Seed Properties
    console.log("🏠 Adding sample properties...");
    const { data: propsData, error: propsError } = await supabase
      .from("listings")
      .insert(sampleProperties)
      .select();

    if (propsError) {
      console.error("❌ Error inserting properties:", propsError);
    } else {
      console.log(`✅ Added ${propsData?.length || 0} properties\n`);
    }

    // Seed Tasks
    console.log("✓ Adding sample tasks...");
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .insert(sampleTasks)
      .select();

    if (tasksError) {
      console.error("❌ Error inserting tasks:", tasksError);
    } else {
      console.log(`✅ Added ${tasksData?.length || 0} tasks\n`);
    }

    // Seed Automation Logs
    console.log("📊 Adding automation logs...");
    const { data: logsData, error: logsError } = await supabase
      .from("automation_logs")
      .insert(sampleAutomationLogs)
      .select();

    if (logsError) {
      console.error("❌ Error inserting automation logs:", logsError);
    } else {
      console.log(`✅ Added ${logsData?.length || 0} automation logs\n`);
    }

    // Seed Integration Status
    console.log("🔌 Adding integration status...");
    const { data: integrationsData, error: integrationsError } = await supabase
      .from("integration_status")
      .insert(sampleIntegrationStatus)
      .select();

    if (integrationsError) {
      console.error("❌ Error inserting integration status:", integrationsError);
    } else {
      console.log(`✅ Added ${integrationsData?.length || 0} integrations\n`);
    }

    console.log("🎉 Database seeding complete!");
    console.log("\n⚠️  Important: Update SAMPLE_USER_ID in this script with your actual user ID");
    console.log("   You can find your user ID in the Supabase auth_users table\n");
  } catch (error) {
    console.error("❌ Unexpected error during seeding:", error);
    process.exit(1);
  }
}

seedDatabase();
