"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Link2,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import {
  Button,
  buttonVariants,
  cn,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
} from "@clippy/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Listing = {
  id: string;
  address: string;
  price: string | number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  property_type: string | null;
  status: string | null;
  created_at: string;
};

type Enquiry = {
  id: string;
  source: string;
  status: string;
  last_activity_at: string;
  metadata: Record<string, unknown> | null;
  leads:
    | { id: string; full_name: string | null; email: string | null }
    | Array<{ id: string; full_name: string | null; email: string | null }>
    | null;
  listings:
    | { id: string; address: string; status: string | null }
    | Array<{ id: string; address: string; status: string | null }>
    | null;
};

type PropertyForm = {
  address: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  propertyType: string;
  status: string;
};

const EMPTY_FORM: PropertyForm = {
  address: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  parking: "",
  propertyType: "",
  status: "active",
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function formatPrice(price: string | number | null) {
  if (price == null || price === "") return "Price not recorded";
  const numeric = Number(String(price).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return String(price);
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function suggestedAddress(enquiry: Enquiry) {
  const value = enquiry.metadata?.property_address;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : "Address not detected";
}

export default function PropertiesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [propertyForm, setPropertyForm] = useState<PropertyForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>(
    {},
  );
  const [linkingEnquiryId, setLinkingEnquiryId] = useState<string | null>(null);
  const [createForEnquiryId, setCreateForEnquiryId] = useState<string | null>(
    null,
  );
  const [requestedEnquiryId, setRequestedEnquiryId] = useState<string | null>(
    null,
  );

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [listingsResponse, enquiriesResponse] = await Promise.all([
        fetch("/api/listings", { cache: "no-store" }),
        fetch("/api/enquiries", { cache: "no-store" }),
      ]);
      const [listingsData, enquiriesData] = await Promise.all([
        listingsResponse.json(),
        enquiriesResponse.json(),
      ]);
      if (!listingsResponse.ok) {
        throw new Error(listingsData.error || "Properties could not be loaded");
      }
      if (!enquiriesResponse.ok) {
        throw new Error(
          enquiriesData.error || "Property enquiries could not be loaded",
        );
      }
      setListings(Array.isArray(listingsData) ? listingsData : []);
      setEnquiries(Array.isArray(enquiriesData) ? enquiriesData : []);
    } catch (reason) {
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "Properties could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    setRequestedEnquiryId(
      new URLSearchParams(window.location.search).get("enquiry_id"),
    );
  }, []);

  const unmatchedEnquiries = useMemo(() => {
    const unmatched = enquiries.filter(
      (enquiry) =>
        !firstRelated(enquiry.listings) &&
        !["lost", "closed"].includes(enquiry.status),
    );
    if (!requestedEnquiryId) return unmatched;
    return unmatched.toSorted((left, right) => {
      if (left.id === requestedEnquiryId) return -1;
      if (right.id === requestedEnquiryId) return 1;
      return 0;
    });
  }, [enquiries, requestedEnquiryId]);

  const visibleListings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return listings.filter((listing) => {
      const matchesStatus =
        statusFilter === "all" || listing.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return `${listing.address} ${listing.property_type || ""} ${listing.status || ""}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [listings, search, statusFilter]);

  const openAddProperty = (enquiry?: Enquiry) => {
    setActionError(null);
    setFormError(null);
    setCreateForEnquiryId(enquiry?.id ?? null);
    setPropertyForm({
      ...EMPTY_FORM,
      address:
        enquiry && suggestedAddress(enquiry) !== "Address not detected"
          ? suggestedAddress(enquiry)
          : "",
    });
    setShowAddProperty(true);
  };

  const updateLinkedEnquiry = (enquiryId: string, listing: Listing) => {
    setEnquiries((current) =>
      current.map((enquiry) =>
        enquiry.id === enquiryId
          ? {
              ...enquiry,
              listings: {
                id: listing.id,
                address: listing.address,
                status: listing.status,
              },
            }
          : enquiry,
      ),
    );
  };

  const linkEnquiry = async (enquiryId: string, listing: Listing) => {
    const response = await fetch("/api/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: enquiryId, listing_id: listing.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "The property could not be linked");
    }
    updateLinkedEnquiry(enquiryId, listing);
  };

  const handleLink = async (enquiry: Enquiry) => {
    const listingId = linkSelections[enquiry.id];
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      setActionError("Choose a property before linking the enquiry.");
      return;
    }

    setActionError(null);
    setLinkingEnquiryId(enquiry.id);
    try {
      await linkEnquiry(enquiry.id, listing);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "The property could not be linked",
      );
    } finally {
      setLinkingEnquiryId(null);
    }
  };

  const handleCreateProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!propertyForm.address.trim()) {
      setFormError("Property address is required.");
      return;
    }

    const duplicate = listings.find(
      (listing) =>
        listing.address.trim().toLocaleLowerCase() ===
        propertyForm.address.trim().toLocaleLowerCase(),
    );
    if (duplicate) {
      if (createForEnquiryId) {
        setCreating(true);
        try {
          await linkEnquiry(createForEnquiryId, duplicate);
          setPropertyForm(EMPTY_FORM);
          setCreateForEnquiryId(null);
          setShowAddProperty(false);
        } catch (reason) {
          setFormError(
            reason instanceof Error
              ? reason.message
              : "The existing property could not be linked",
          );
        } finally {
          setCreating(false);
        }
        return;
      }
      setFormError(
        "That property already exists. Open it from the directory instead of creating a duplicate.",
      );
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: propertyForm.address.trim(),
          price: propertyForm.price.replace(/[$,\s]/g, "") || undefined,
          bedrooms: propertyForm.bedrooms
            ? Number(propertyForm.bedrooms)
            : undefined,
          bathrooms: propertyForm.bathrooms
            ? Number(propertyForm.bathrooms)
            : undefined,
          parking: propertyForm.parking
            ? Number(propertyForm.parking)
            : undefined,
          property_type: propertyForm.propertyType.trim() || undefined,
          status: propertyForm.status,
        }),
      });
      const created = await response.json();
      if (!response.ok) {
        throw new Error(created.error || "Property could not be created");
      }

      const listing = created as Listing;
      setListings((current) => [listing, ...current]);
      if (createForEnquiryId) {
        try {
          await linkEnquiry(createForEnquiryId, listing);
        } catch (reason) {
          setActionError(
            `The property was created, but the enquiry was not linked: ${
              reason instanceof Error ? reason.message : "try linking it again"
            }`,
          );
          setPropertyForm(EMPTY_FORM);
          setCreateForEnquiryId(null);
          setShowAddProperty(false);
          return;
        }
      }
      setPropertyForm(EMPTY_FORM);
      setCreateForEnquiryId(null);
      setShowAddProperty(false);
    } catch (reason) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : "Property could not be created",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingState label="Loading properties" />;
  if (loadError) {
    return (
      <ErrorState
        title="Properties could not be loaded"
        description={loadError}
        action={<Button onClick={() => void loadWorkspace()}>Try again</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Property directory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search listings, open Property 360, and match every enquiry to the
            right property.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inspections"
            className={buttonVariants({ variant: "outline" })}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Inspection bookings
          </Link>
          <Button onClick={() => openAddProperty()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add property
          </Button>
        </div>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      ) : null}

      {unmatchedEnquiries.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-soft sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                Enquiries needing a property
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Link these conversations before confirming inspections or asking
                Clippy to act on property facts.
              </p>
            </div>
            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {unmatchedEnquiries.length} unmatched
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {unmatchedEnquiries.map((enquiry) => {
              const lead = firstRelated(enquiry.leads);
              return (
                <article
                  key={enquiry.id}
                  className={cn(
                    "rounded-2xl border border-amber-200 bg-white p-4",
                    enquiry.id === requestedEnquiryId &&
                      "ring-2 ring-amber-500 ring-offset-2",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                      <Link2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900">
                        {suggestedAddress(enquiry)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {lead?.full_name || lead?.email || "Unnamed client"} ·{" "}
                        <span className="capitalize">{enquiry.source}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <label
                      className="sr-only"
                      htmlFor={`property-${enquiry.id}`}
                    >
                      Property for {lead?.full_name || "enquiry"}
                    </label>
                    <select
                      id={`property-${enquiry.id}`}
                      value={linkSelections[enquiry.id] || ""}
                      onChange={(event) =>
                        setLinkSelections((current) => ({
                          ...current,
                          [enquiry.id]: event.target.value,
                        }))
                      }
                      className="min-h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                    >
                      <option value="">Choose an existing property</option>
                      {listings.map((listing) => (
                        <option key={listing.id} value={listing.id}>
                          {listing.address}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      disabled={
                        !linkSelections[enquiry.id] ||
                        linkingEnquiryId === enquiry.id
                      }
                      onClick={() => void handleLink(enquiry)}
                    >
                      {linkingEnquiryId === enquiry.id
                        ? "Linking…"
                        : "Link property"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openAddProperty(enquiry)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create and link
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search properties"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by address, property type or status"
              className="pl-9"
            />
          </div>
          <label className="sr-only" htmlFor="property-status-filter">
            Filter properties by status
          </label>
          <select
            id="property-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground md:w-48"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="available">Available</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {visibleListings.length} of {listings.length} propert
          {listings.length === 1 ? "y" : "ies"}
        </p>

        {listings.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={Building2}
              title="No properties yet"
              description="Add the first property so Clippy can match enquiries, prepare accurate replies, and schedule inspections."
              action={
                <Button onClick={() => openAddProperty()}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add your first property
                </Button>
              }
            />
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold text-foreground">
              No matching properties
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another address or clear the status filter.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold capitalize text-emerald-700">
                    {listing.status || "active"}
                  </span>
                </div>
                <h2 className="mt-4 font-bold text-foreground">
                  {listing.address}
                </h2>
                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                  {formatPrice(listing.price)}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {listing.bedrooms ? (
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5" />
                      {listing.bedrooms} bed
                    </span>
                  ) : null}
                  {listing.bathrooms ? (
                    <span className="inline-flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      {listing.bathrooms} bath
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 capitalize">
                    <MapPin className="h-3.5 w-3.5" />
                    {listing.property_type || "Property"}
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Link
                    href={`/property/${listing.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Open Property 360
                  </Link>
                  <Link
                    href={`/inspections/slots?listingId=${listing.id}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                  >
                    Inspection slots
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={showAddProperty}
        onOpenChange={(open) => {
          if (creating) return;
          setShowAddProperty(open);
          if (!open) {
            setCreateForEnquiryId(null);
            setPropertyForm(EMPTY_FORM);
            setFormError(null);
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreateProperty}>
            <DialogHeader>
              <DialogTitle>
                {createForEnquiryId
                  ? "Create and link property"
                  : "Add property"}
              </DialogTitle>
              <DialogDescription>
                {createForEnquiryId
                  ? "Create the listing and connect the selected enquiry in one step."
                  : "Add a property to the agency directory and make it available to Clippy."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-foreground">
                  Address
                </span>
                <Input
                  autoFocus
                  value={propertyForm.address}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  placeholder="25 Collins Street, Melbourne"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Property type
                </span>
                <Input
                  value={propertyForm.propertyType}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      propertyType: event.target.value,
                    }))
                  }
                  placeholder="Apartment"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Price
                </span>
                <Input
                  inputMode="decimal"
                  value={propertyForm.price}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="750000"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Bedrooms
                </span>
                <Input
                  type="number"
                  min="1"
                  value={propertyForm.bedrooms}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      bedrooms: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Bathrooms
                </span>
                <Input
                  type="number"
                  min="1"
                  value={propertyForm.bathrooms}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      bathrooms: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Parking spaces
                </span>
                <Input
                  type="number"
                  min="1"
                  value={propertyForm.parking}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      parking: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-foreground">
                  Status
                </span>
                <select
                  value={propertyForm.status}
                  onChange={(event) =>
                    setPropertyForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="min-h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="active">Active</option>
                  <option value="available">Available</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="sold">Sold</option>
                </select>
              </label>
            </div>

            {formError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
              >
                {formError}
              </p>
            ) : null}

            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={creating}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating
                  ? "Saving…"
                  : createForEnquiryId
                    ? "Create and link"
                    : "Add property"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
