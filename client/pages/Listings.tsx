import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash,
  Image,
  QrCode,
  Share2,
  MapPin,
  Bed,
  Bath,
  Car,
  DollarSign,
  ArrowLeft,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";

interface Listing {
  id: string;
  org_id: string;
  agent_user_id: string | null;
  status: string;
  type_sale_rent: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  price_display: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  carspaces: number | null;
  features_json?: any;
  description_raw: string | null;
  created_at: string;
  updated_at: string;
}

const LISTING_STATUS_OPTIONS = ["draft", "active", "pending", "sold"];
const LISTING_TYPE_OPTIONS = ["sale", "rent"];

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const navigate = useNavigate();

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
    description_raw: "",
  });

  // Fetch user org ID and listings
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        navigate("/login");
        return;
      }

      try {
        // Try to get org_id from user_org_roles
        const { data: orgRole } = await supabase
          .from("user_org_roles")
          .select("org_id")
          .eq("user_id", session.user.id)
          .single();

        const orgId = orgRole?.org_id || "default";
        setUserOrgId(orgId);

        // Fetch listings
        const { data: listingsData } = await supabase
          .from("listings")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false });

        if (listingsData) {
          setListings(listingsData);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchUserData();
  }, [navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !userOrgId ||
      !formData.address ||
      !formData.suburb ||
      !formData.state ||
      !formData.postcode
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    const listingData = {
      ...formData,
      org_id: userOrgId,
      agent_user_id: userId,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingListing) {
        // Update
        const { error } = await supabase
          .from("listings")
          .update(listingData)
          .eq("id", editingListing.id)
          .eq("org_id", userOrgId);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) =>
            l.id === editingListing.id ? { ...l, ...listingData } : l
          )
        );
      } else {
        // Insert
        const { data: newListing, error } = await supabase
          .from("listings")
          .insert([listingData])
          .select();

        if (error) throw error;

        if (newListing) {
          setListings((prev) => [newListing[0], ...prev]);
        }
      }

      // Reset form
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
        description_raw: "",
      });
      setEditingListing(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving listing:", err);
      alert("Failed to save listing");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (listing: Listing) => {
    setEditingListing(listing);
    setFormData(listing);
    setShowForm(true);
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId)
        .eq("org_id", userOrgId);

      if (error) throw error;

      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error("Error deleting listing:", err);
      alert("Failed to delete listing");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showNav={true}>
      <div className="max-w-7xl mx-auto">
        {!showForm ? (
          <>
            {/* Listings List View */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Listings</h1>
                <p className="text-muted-foreground">Manage all your property listings in one place</p>
              </div>
              <div className="flex gap-3">
                <button
                  disabled
                  title="AI-powered suggestions coming soon"
                  className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-lg border border-primary/30 hover:border-primary/50 transition-colors font-semibold cursor-not-allowed opacity-60"
                >
                  <Sparkles className="w-5 h-5" />
                  AI Suggest Listings
                </button>
                <button
                  onClick={() => {
                    setEditingListing(null);
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
                      description_raw: "",
                    });
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:shadow-lg transition-all font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  New Listing
                </button>
              </div>
            </div>

            {listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Listing Image Placeholder */}
                    <div className="w-full h-48 bg-gradient-to-br from-cyan-900 to-slate-900 flex items-center justify-center">
                      <Image className="w-12 h-12 text-cyan-400/30" />
                    </div>

                    {/* Listing Info */}
                    <div className="p-5">
                      {/* Address */}
                      <h3 className="font-bold text-lg text-foreground mb-1">
                        {listing.address}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {listing.suburb}, {listing.state} {listing.postcode}
                      </p>

                      {/* Price & Type */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <span className="font-bold text-xl text-foreground">
                            {listing.price_display || "TBD"}
                          </span>
                        </div>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                          {listing.type_sale_rent === "sale" ? "For Sale" : "For Rent"}
                        </span>
                      </div>

                      {/* Property Features */}
                      <div className="flex gap-4 mb-5 text-sm text-muted-foreground">
                        {listing.bedrooms !== null && (
                          <div className="flex items-center gap-1">
                            <Bed className="w-4 h-4" />
                            {listing.bedrooms}
                          </div>
                        )}
                        {listing.bathrooms !== null && (
                          <div className="flex items-center gap-1">
                            <Bath className="w-4 h-4" />
                            {listing.bathrooms}
                          </div>
                        )}
                        {listing.carspaces !== null && (
                          <div className="flex items-center gap-1">
                            <Car className="w-4 h-4" />
                            {listing.carspaces}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 mb-4">
                        <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          listing.status === "active"
                            ? "bg-emerald-900/40 text-emerald-300"
                            : listing.status === "sold"
                              ? "bg-slate-700/40 text-slate-300"
                              : "bg-yellow-900/40 text-yellow-300"
                        }`}
                      >
                          {listing.status.charAt(0).toUpperCase() +
                            listing.status.slice(1)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(listing)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-semibold text-foreground"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteListing(listing.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors text-sm font-semibold text-destructive"
                        >
                          <Trash className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 px-6">
                {/* Premium Empty State */}
                <div className="max-w-md mx-auto">
                  <div className="mb-6 inline-flex items-center justify-center">
                    <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl">
                      <TrendingUp className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Ready to List Your First Property?
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Start showcasing your properties to potential buyers and renters.
                  </p>
                  <p className="text-sm text-muted-foreground mb-8">
                    Create professional listings with high-quality details, images, and AI-powered descriptions to maximize engagement.
                  </p>

                  <div className="bg-cyan-900/40 border-2 border-cyan-400/40 rounded-xl p-4 mb-8 text-left backdrop-blur-sm">
                    <p className="text-sm text-cyan-200 font-semibold mb-3">Why create listings?</p>
                    <ul className="space-y-2 text-xs text-cyan-300/90">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold mt-0.5">✓</span>
                        Reach thousands of qualified prospects
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
                        AI-powered recommendations for pricing
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
                        Market insights and neighborhood data
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold mt-0.5">✓</span>
                        Schedule showings directly in Clippy
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setEditingListing(null);
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
                          description_raw: "",
                        });
                        setShowForm(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg hover:shadow-lg hover:shadow-primary/50 transition-all font-bold text-lg"
                    >
                      <Plus className="w-5 h-5" />
                      Create First Listing
                    </button>
                    <button
                      disabled
                      className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary/10 text-primary rounded-lg border border-primary/30 font-semibold cursor-not-allowed opacity-60"
                    >
                      <Sparkles className="w-5 h-5" />
                      Get AI Suggestions
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-6">
                    💡 Tip: Use AI Radar to discover properties in high-demand areas
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Listing Form */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingListing(null);
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
              <h1 className="text-3xl font-bold text-foreground">
                {editingListing ? "Edit Listing" : "Create New Listing"}
              </h1>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8 max-w-3xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={formData.address || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 123 Main Street"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* Suburb */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Suburb *
                    </label>
                    <input
                      type="text"
                      id="suburb"
                      value={formData.suburb || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., Sydney"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      value={formData.state || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., NSW"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* Postcode */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      id="postcode"
                      value={formData.postcode || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 2000"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Type *
                    </label>
                    <select
                      id="type_sale_rent"
                      value={formData.type_sale_rent || "sale"}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {LISTING_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === "sale" ? "For Sale" : "For Rent"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status || "draft"}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {LISTING_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Price
                    </label>
                    <input
                      type="text"
                      id="price_display"
                      value={formData.price_display || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., $750,000"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      id="bedrooms"
                      value={formData.bedrooms ?? ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 3"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Bathrooms */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      id="bathrooms"
                      value={formData.bathrooms ?? ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 2"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Carspaces */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Carspaces
                    </label>
                    <input
                      type="number"
                      id="carspaces"
                      value={formData.carspaces ?? ""}
                      onChange={handleInputChange}
                      placeholder="e.g., 2"
                      className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    id="description_raw"
                    value={formData.description_raw || ""}
                    onChange={handleInputChange}
                    placeholder="Enter listing description..."
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={5}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? "Saving..."
                      : editingListing
                        ? "Update Listing"
                        : "Create Listing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingListing(null);
                    }}
                    className="flex-1 py-3 px-4 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
