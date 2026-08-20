"use client";
import { CheckCircle, Circle, Clock } from "lucide-react";

const stages = [
  { id: "qualification", label: "Qualified" },
  { id: "searching", label: "Searching" },
  { id: "inspecting", label: "Inspected" },
  { id: "offer", label: "Offer in" },
  { id: "contract", label: "Under contract" },
  { id: "exchanged", label: "Exchanged" },
];

interface DealProgressProps {
  currentStage: string;
  propertyName: string;
  address: string;
  price: string;
  daysOnMarket: number;
  nextAction: string;
}

export function DealProgress({
  currentStage,
  propertyName,
  address,
  price,
  daysOnMarket,
  nextAction,
}: DealProgressProps) {
  const currentIdx = stages.findIndex((s) => s.id === currentStage);
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">{propertyName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{address}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-foreground">{price}</p>
          <p className="text-[10px] text-muted-foreground">
            {daysOnMarket} days on market
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 mb-4">
        {stages.map((stage, i) => {
          const Icon = i <= currentIdx ? CheckCircle : Circle;
          const isCurrent = i === currentIdx;
          const isPast = i < currentIdx;
          return (
            <div key={stage.id} className="flex-1 flex flex-col items-center">
              <Icon
                className={
                  "w-5 h-5 " +
                  (isPast
                    ? "text-emerald-500"
                    : isCurrent
                      ? "text-primary"
                      : "text-muted-foreground/30")
                }
              />
              <span
                className={
                  "text-[8px] mt-1 text-center " +
                  (isCurrent
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground/50")
                }
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs text-foreground flex-1">
          Next: {nextAction}
        </span>
        <button
          type="button"
          className="text-xs text-primary font-semibold hover:underline"
        >
          Do it
        </button>
      </div>
    </div>
  );
}
