import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash,
  Image,
  QrCode,
  Share2,
  ListFilter,
  MapPin,
  Bed,
  Bath,
  Car,
  DollarSign,
  Info,
} from "lucide-react";
import Layout from "@/components/Layout";
import { createClient } from "@supabase/supabase-js";

// --- Supabase Project URL and Anon Key ---
const SUPABASE_URL = "https://mqydieqeybgxtjqogrwh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fgi9j879wWGlzEQbt0i7Yw_D7rYZG3g";
// -----------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- INTERFACES (Matching Supabase Schema) ---
interface Listing {
  id: string;
  org_id: string;
  agent_user_id: string | null;
  status: string; // 'draft', 'active', 'pending', 'sold', 'leased', 'archived'
  type_sale_rent: string; // 'sale', 'rent'
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  price_display: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  features_json: any; // JSONB
  description_raw: string | null;
  media_urls_json: string[] | null; // JSONB as string array
  source: string | null;
  external_listing_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Configuration for Dropdowns ---
const LISTING_STATUS_OPTIONS = [
  "draft",
  "active",
  "pending",
  "sold",
  "leased",
  "archived",
];
const LISTING_TYPE_OPTIONS = ["sale", "rent"];

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false); // To toggle between list and form
  const [editingListing, setEditingListing] = useState<Listing | null>(null); // For edit mode

  // Form state for new/editing listing
  const [formData, setFormData] = useState<Partial<Listing>>({
    status: "draft",
    type_sale_rent: "sale",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    price_display: "",
    bedrooms: null,
    bathrooms: null,
    carspaces: null,
    features_json: {}, // Initialize as empty object
    description_raw: "",
    media_urls_json: [],
  });

  const navigate = useNavigate();

  // Effect to fetch user's org_id
  useEffect(() => {
    const fetchUserOrgId = async () => {
      const userSession = await supabase.auth.getSession();
      const userId = userSession.data.session?.user?.id;

      if (!userId) {
        navigate("/signup");
        return;
      }

      const { data, error: orgError } = await supabase
        .from("user_org_roles")
        .select("org_id")
        .eq("user_id", userId)
        .single();

      if (orgError) {
        console.error("Error fetching user's org_id:", orgError);
        setError("Failed to retrieve user's organization ID.");
        setUserOrgId(null);
      } else if (data) {
        setUserOrgId(data.org_id);
      } else {
        setError("User is not linked to any organization.");
        setUserOrgId(null);
      }
    };
    fetchUserOrgId();
  }, [navigate]);

  // Effect to fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      if (!userOrgId) return; // Wait until org_id is available

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("org_id", userOrgId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching listings:", fetchError);
        setError("Failed to load listings.");
      } else {
        setListings(data || []);
      }
      setLoading(false);
    };

    fetchListings();
  }, [userOrgId, showForm]); // Re-fetch when org_id or form visibility changes

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "number" ? (value === "" ? null : Number(value)) : value,
    }));
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      setFormData((prev) => ({
        ...prev,
        features_json: JSON.parse(e.target.value),
      }));
    } catch (err) {
      // Keep as string if invalid JSON, error handling will be done on submit
      setFormData((prev) => ({ ...prev, features_json: e.target.value as any }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOrgId || !formData.address || !formData.suburb || !formData.state || !formData.postcode || !formData.type_sale_rent || !formData.status) {
      setError("Please fill in all required listing details.");
      return;
    }

    setLoading(true);
    setError(null);

    const userSession = await supabase.auth.getSession();
    const userId = userSession.data.session?.user?.id;

    if (!userId) {
      setError("User ID not found. Please log in.");
      setLoading(false);
      return;
    }

    const listingDataToSave = {
      ...formData,
      org_id: userOrgId,
      agent_user_id: userId,
      features_json: typeof formData.features_json === 'string' ? JSON.parse(formData.features_json) : formData.features_json, // Ensure it's object
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let response;
    if (editingListing) {
      // Update existing listing
      response = await supabase
        .from("listings")
        .update(listingDataToSave)
        .eq("id", editingListing.id)
        .eq("org_id", userOrgId)
        .select();
    } else {
      // Insert new listing
      response = await supabase
        .from("listings")
        .insert(listingDataToSave)
        .select();
    }

    if (response.error) {
      console.error("Error saving listing:", response.error);
      setError(`Failed to save listing: ${response.error.message}`);
    } else {
      setFormData({
        status: "draft",
        type_sale_rent: "sale",
        address: "",
        suburb: "",
        state: "",
        postcode: "",
        price_display: "",
        bedrooms: null,
        bathrooms: null,
        carspaces: null,
        features_json: {},
        description_raw: "",
        media_urls_json: [],
      });
      setEditingListing(null);
      setShowForm(false); // Go back to list view
      // Re-fetch listings to update the list
      // This will be triggered by useEffect's dependency on showForm
    }
    setLoading(false);
  };

  const handleEditClick = (listing: Listing) => {
    setEditingListing(listing);
    setFormData({
      ...listing,
      features_json: typeof listing.features_json === 'object' ? JSON.stringify(listing.features_json, null, 2) : listing.features_json, // Display as string for editing
      media_urls_json: listing.media_urls_json || [] // Ensure it's an array
    });
    setShowForm(true);
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    if (!userOrgId) return;

    setLoading(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
      .eq('org_id', userOrgId);

    if (deleteError) {
      console.error("Error deleting listing:", deleteError);
      setError("Failed to delete listing.");
    } else {
      setListings(prev => prev.filter(l => l.id !== listingId));
    }
    setLoading(false);
  };

  if (loading && !listings.length) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto p-6 text-center text-muted-foreground">
          Loading listings...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showNav={true}>
        <div className="max-w-7xl mx-auto p-6 text-center text-red-500">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNav={true}>
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Listings</h1>
          <button
            onClick={() => {
              setEditingListing(null); // Clear editing state for new form
              setFormData({
                status: "draft", type_sale_rent: "sale", address: "", suburb: "", state: "", postcode: "",
                price_display: "", bedrooms: null, bathrooms: null, carspaces: null, features_json: {},
                description_raw: "", media_urls_json: [],
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" /> New Listing
          </button>
        </div>

        {showForm ? (
          // Listing Create/Edit Form
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-6">
              {editingListing ? "Edit Listing" : "Create New Listing"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Address */}
                <div className="form-group">
                  <label htmlFor="address" className="label-style">Address *</label>
                  <input type="text" id="address" value={formData.address || ""} onChange={handleInputChange} className="input-style" required />
                </div>
                {/* Suburb */}
                <div className="form-group">
                  <label htmlFor="suburb" className="label-style">Suburb *</label>
                  <input type="text" id="suburb" value={formData.suburb || ""} onChange={handleInputChange} className="input-style" required />
                </div>
                {/* State */}
                <div className="form-group">
                  <label htmlFor="state" className="label-style">State *</label>
                  <input type="text" id="state" value={formData.state || ""} onChange={handleInputChange} className="input-style" required />
                </div>
                {/* Postcode */}
                <div className="form-group">
                  <label htmlFor="postcode" className="label-style">Postcode *</label>
                  <input type="text" id="postcode" value={formData.postcode || ""} onChange={handleInputChange} className="input-style" required />
                </div>
                {/* Type (Sale/Rent) */}
                <div className="form-group">
                  <label htmlFor="type_sale_rent" className="label-style">Type *</label>
                  <select id="type_sale_rent" value={formData.type_sale_rent || "sale"} onChange={handleInputChange} className="input-style" required>
                    {LISTING_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{
                        ...(truncated)...