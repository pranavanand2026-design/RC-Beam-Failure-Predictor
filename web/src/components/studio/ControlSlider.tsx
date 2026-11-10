"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { useEffect, useState } from "react";
import { formatValue, type BeamPart, type FeatureControl } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  control: FeatureControl;
  value: number;
  baseline?: number;
  onChange: (value: number) => void;
  onFocusPart: (part: BeamPart) => void;
  compact?: boolean;
}

export function ControlSlider({ control, value, baseline, onChange, onFocusPart, compact }: Props) {
  const { min, max, step, decimals, label, unit, hint, part } = control;
  const clamped = Math.min(max, Math.max(min, value));
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => setDraft(null), [value]);

  const commit = () => {
    if (draft === null) return;
    const n = parseFloat(draft.replace(/,/g, ""));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };

  const changed = baseline !== undefined && Math.abs(baseline - value) > step / 2;
  const basePct =
    baseline !== undefined ? ((Math.min(max, Math.max(min, baseline)) - min) / (max - min)) * 100 : null;

  return (
    <div
      className={cn("group", compact ? "py-2" : "py-3")}
      onMouseEnter={() => onFocusPart(part)}
      onMouseLeave={() => onFocusPart(null)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`ctl-${control.key}`} className="text-sm font-medium">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            id={`ctl-${control.key}`}
            inputMode="decimal"
            className={cn(
              "tnum w-20 rounded-md bg-transparent px-1.5 py-0.5 text-right text-sm font-semibold outline-none transition-colors",
              "hover:bg-surface-2 focus:bg-surface-2",
              changed && "text-accent"
            )}
            value={draft ?? formatValue(value, decimals)}
            onFocus={(e) => {
              onFocusPart(part);
              e.target.select();
            }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setDraft(null);
            }}
          />
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>

      <SliderPrimitive.Root
        className="relative mt-2 flex h-5 w-full touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[clamped]}
        onValueChange={([v]) => onChange(v)}
        onPointerDown={() => onFocusPart(part)}
        aria-label={label}
      >
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-surface-2">
          <SliderPrimitive.Range className="absolute h-full bg-foreground" />
        </SliderPrimitive.Track>
        {basePct !== null && changed && (
          <span
            className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/60"
            style={{ left: `${basePct}%` }}
            title="Starting value"
          />
        )}
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-foreground bg-surface shadow-sm transition-transform hover:scale-110 focus-visible:scale-110 active:scale-95" />
      </SliderPrimitive.Root>

      {hint && !compact && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
