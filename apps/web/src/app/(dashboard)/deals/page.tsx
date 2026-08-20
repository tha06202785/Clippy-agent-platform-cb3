"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Home, Plus, ChevronRight } from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
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

interface Deal {
  id: string;
  address: string;
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  property_type: string | null;
  created_at: string;
  stage?: string;
  lead_name?: string;
}

interface DealForm {
  address: string;
  price: string;
  stage: string;
  bedrooms: string;
  bathrooms: string;
}

type ListingApiRecord = {
  id: string;
  address: string;
  price?: string | number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status?: string | null;
  property_type?: string | null;
  created_at: string;
  stage?: string | null;
};

const EMPTY_DEAL_FORM: DealForm = {
  address: "",
  price: "",
  stage: "inquiry",
  bedrooms: "",
  bathrooms: "",
};

function toDeal(listing: ListingApiRecord): Deal {
  return {
    id: listing.id,
    address: listing.address,
    price: listing.price == null ? null : String(listing.price),
    bedrooms: listing.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? null,
    status: listing.status || "active",
    property_type: listing.property_type ?? null,
    created_at: listing.created_at,
    stage: listing.stage || "inquiry",
  };
}

const STAGES = [
  {
    id: "inquiry",
    label: "New Inquiry",
    color: "bg-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  {
    id: "contacted",
    label: "Contacted",
    color: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  {
    id: "qualified",
    label: "Qualified",
    color: "bg-purple-500",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
  },
  {
    id: "proposal",
    label: "Proposal",
    color: "bg-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  {
    id: "negotiation",
    label: "Negotiating",
    color: "bg-pink-500",
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
  },
  {
    id: "closed_won",
    label: "Won 🎉",
    color: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  {
    id: "closed_lost",
    label: "Lost",
    color: "bg-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
  },
];

const STAGE_ORDER = [
  "inquiry",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

function formatPrice(price: string | null) {
  if (!price) return null;
  const num = parseFloat(price.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return price;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num}`;
}

function daysOnMarket(created: string) {
  const diff = Date.now() - new Date(created).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [dealForm, setDealForm] = useState<DealForm>(EMPTY_DEAL_FORM);
  const [dealError, setDealError] = useState<string | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [creatingDeal, setCreatingDeal] = useState(false);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/listings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Opportunities could not be loaded");
      setDeals(Array.isArray(data) ? data.map(toDeal) : []);
    } catch (reason) {
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "Opportunities could not be loaded",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  const dealsByStage = STAGE_ORDER.reduce(
    (acc, stageId) => {
      acc[stageId] = deals.filter(
        (d) => d.stage === stageId || (stageId === "inquiry" && !d.stage),
      );
      return acc;
    },
    {} as Record<string, Deal[]>,
  );

  const wonDeals = dealsByStage["closed_won"] || [];
  const totalValue = wonDeals.reduce((sum, d) => {
    const num = parseFloat((d.price || "0").replace(/[^0-9.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const handleCreateDeal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDealError(null);

    if (!dealForm.address.trim()) {
      setDealError("Property address is required.");
      return;
    }

    setCreatingDeal(true);
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: dealForm.address.trim(),
          price: dealForm.price.replace(/[$,\s]/g, "") || undefined,
          stage: dealForm.stage,
          status: "active",
          bedrooms: dealForm.bedrooms ? Number(dealForm.bedrooms) : undefined,
          bathrooms: dealForm.bathrooms
            ? Number(dealForm.bathrooms)
            : undefined,
        }),
      });
      const created = await response.json();
      if (!response.ok) {
        throw new Error(created.error || "Deal could not be created.");
      }

      setDeals((current) => [toDeal(created), ...current]);
      setDealForm(EMPTY_DEAL_FORM);
      setShowAddDeal(false);
    } catch (error) {
      setDealError(
        error instanceof Error ? error.message : "Deal could not be created.",
      );
    } finally {
      setCreatingDeal(false);
    }
  };

  const handleStageMove = async (dealId: string, newStage: string) => {
    setStageError(null);
    try {
      const response = await fetch(`/api/listings/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "The opportunity stage could not be updated",
        );
      }
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
      );
    } catch (reason) {
      setStageError(
        reason instanceof Error
          ? reason.message
          : "The opportunity stage could not be updated",
      );
    }
  };

  if (loading) {
    return <LoadingState label="Loading opportunities" />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Opportunities could not be loaded"
        description={loadError}
        action={<Button onClick={() => void loadDeals()}>Try again</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            {deals.length} deal{deals.length !== 1 ? "s" : ""} ·
            {wonDeals.length > 0 &&
              ` ${wonDeals.length} closed · ${formatPrice(String(totalValue)) || "$0"} closed value`}
            {deals.filter(
              (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
            ).length > 0 &&
              ` · ${deals.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost").length} in progress`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex overflow-hidden rounded-lg border border-border"
            role="group"
            aria-label="Pipeline view"
          >
            <button
              type="button"
              onClick={() => setView("kanban")}
              aria-pressed={view === "kanban"}
              className={
                "px-3 py-1.5 text-xs font-medium transition-colors " +
                (view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground")
              }
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={
                "px-3 py-1.5 text-xs font-medium transition-colors " +
                (view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground")
              }
            >
              List
            </button>
          </div>
          <Button onClick={() => setShowAddDeal(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add deal
          </Button>
        </div>
      </div>

      {stageError ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {stageError}
        </p>
      ) : null}

      {deals.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No opportunities yet"
          description="Add your first property listing to start tracking the pipeline. Each listing becomes an opportunity you can move through stages."
          action={
            <Button onClick={() => setShowAddDeal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add your first
              deal
            </Button>
          }
        />
      ) : view === "kanban" ? (
        /* Kanban board */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = dealsByStage[stage.id] || [];
            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className={"w-2 h-2 rounded-full " + stage.color} />
                    <span className="text-xs font-semibold text-foreground">
                      {stage.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({stageDeals.length})
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => {
                    const currentIndex = STAGE_ORDER.indexOf(
                      deal.stage || "inquiry",
                    );
                    const previousStage =
                      currentIndex > 0 ? STAGE_ORDER[currentIndex - 1] : null;
                    const nextStage =
                      currentIndex < STAGE_ORDER.length - 2
                        ? STAGE_ORDER[currentIndex + 1]
                        : null;

                    return (
                      <article
                        key={deal.id}
                        className={
                          "rounded-xl border bg-card p-4 transition-all hover:border-primary/50 " +
                          (activeStage === deal.id
                            ? "border-primary shadow-md"
                            : "border-border")
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStage(
                              activeStage === deal.id ? null : deal.id,
                            )
                          }
                          aria-expanded={activeStage === deal.id}
                          className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="mb-2 flex items-start justify-between">
                            <span className="line-clamp-2 text-sm font-medium leading-tight text-foreground">
                              {deal.address}
                            </span>
                            {deal.price ? (
                              <span className="ml-2 flex-shrink-0 text-sm font-bold text-foreground">
                                {formatPrice(deal.price)}
                              </span>
                            ) : null}
                          </span>
                          <span className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                            {deal.bedrooms ? (
                              <span>{deal.bedrooms} bed</span>
                            ) : null}
                            {deal.bedrooms && deal.bathrooms ? (
                              <span>·</span>
                            ) : null}
                            {deal.bathrooms ? (
                              <span>{deal.bathrooms} bath</span>
                            ) : null}
                            <span>·</span>
                            <span>{daysOnMarket(deal.created_at)}d</span>
                          </span>
                        </button>
                        <div className="flex items-center justify-between">
                          <span
                            className={
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                              stage.bg +
                              " " +
                              stage.text
                            }
                          >
                            {stage.label}
                          </span>
                          <div className="flex gap-1">
                            {previousStage ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStageMove(deal.id, previousStage)
                                }
                                className="rounded p-2 transition-colors hover:bg-muted"
                                aria-label={
                                  "Move " +
                                  deal.address +
                                  " to " +
                                  (STAGES.find(
                                    (item) => item.id === previousStage,
                                  )?.label ?? previousStage)
                                }
                              >
                                <ChevronRight
                                  className="h-3 w-3 rotate-180 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </button>
                            ) : null}
                            {nextStage ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStageMove(deal.id, nextStage)
                                }
                                className="rounded p-2 transition-colors hover:bg-muted"
                                aria-label={
                                  "Move " +
                                  deal.address +
                                  " to " +
                                  (STAGES.find((item) => item.id === nextStage)
                                    ?.label ?? nextStage)
                                }
                              >
                                <ChevronRight
                                  className="h-3 w-3 text-muted-foreground"
                                  aria-hidden="true"
                                />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                      <p className="text-xs text-muted-foreground">
                        Drop deals here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[720px]">
            <caption className="sr-only">Opportunity pipeline</caption>
            <thead>
              <tr className="border-b border-border">
                {[
                  "Property",
                  "Stage",
                  "Bed/Bath",
                  "Price",
                  "Days",
                  "Next Action",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => {
                const stage =
                  STAGES.find((s) => s.id === deal.stage) || STAGES[0];
                return (
                  <tr
                    key={deal.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {deal.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {deal.property_type || "Property"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold " +
                          stage.bg +
                          " " +
                          stage.text
                        }
                      >
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {[deal.bedrooms, deal.bathrooms]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">
                      {deal.price ? formatPrice(deal.price) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {daysOnMarket(deal.created_at)}d
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = Math.min(
                            STAGE_ORDER.indexOf(deal.stage || "inquiry") + 1,
                            STAGE_ORDER.length - 1,
                          );
                          handleStageMove(deal.id, STAGE_ORDER[nextIdx]);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
                      >
                        Advance{" "}
                        <ChevronRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={showAddDeal}
        onOpenChange={(open) => {
          setShowAddDeal(open);
          if (!open) setDealError(null);
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreateDeal}>
            <DialogHeader>
              <DialogTitle>Add opportunity</DialogTitle>
              <DialogDescription>
                Add a property to the pipeline. You can move it through stages
                at any time.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-3">
              <div>
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="deal-address"
                >
                  Property Address
                </label>
                <Input
                  id="deal-address"
                  type="text"
                  placeholder="123 Example St"
                  value={dealForm.address}
                  onChange={(event) =>
                    setDealForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  className="mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="deal-price"
                  >
                    Price
                  </label>
                  <Input
                    id="deal-price"
                    type="text"
                    inputMode="numeric"
                    placeholder="500,000"
                    value={dealForm.price}
                    onChange={(event) =>
                      setDealForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="deal-stage"
                  >
                    Stage
                  </label>
                  <Select
                    id="deal-stage"
                    value={dealForm.stage}
                    onChange={(event) =>
                      setDealForm((current) => ({
                        ...current,
                        stage: event.target.value,
                      }))
                    }
                    className="mt-1"
                  >
                    <option value="inquiry">New Inquiry</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiating</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="deal-bedrooms"
                  >
                    Bedrooms
                  </label>
                  <Input
                    id="deal-bedrooms"
                    type="number"
                    min="1"
                    placeholder="3"
                    value={dealForm.bedrooms}
                    onChange={(event) =>
                      setDealForm((current) => ({
                        ...current,
                        bedrooms: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="deal-bathrooms"
                  >
                    Bathrooms
                  </label>
                  <Input
                    id="deal-bathrooms"
                    type="number"
                    min="1"
                    placeholder="2"
                    value={dealForm.bathrooms}
                    onChange={(event) =>
                      setDealForm((current) => ({
                        ...current,
                        bathrooms: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              {dealError && (
                <p className="text-sm text-destructive" role="alert">
                  {dealError}
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                isLoading={creatingDeal}
                loadingText="Creating…"
              >
                Create opportunity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
