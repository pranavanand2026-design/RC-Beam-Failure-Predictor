"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CONTROL_BY_KEY, formatValue } from "@/lib/constants";
import type { AnalyzeResponse, RecommendationResponse } from "@/lib/types";

interface Props {
  features: Record<string, number>;
  exposure: number;
  margin: number;
  holds: boolean | null;
  onApply: (changes: Record<string, number>) => void;
}

function describe(r: RecommendationResponse) {
  const c = CONTROL_BY_KEY[r.feature];
  const label = c?.label ?? r.title;
  const d = c?.decimals ?? 0;
  const unit = c?.unit === "% of capacity" ? "%" : c?.unit ?? r.unit;
  const verb = r.target > r.current ? "Raise" : "Lower";
  return {
    text: `${verb} ${label.toLowerCase()}`,
    range: `${formatValue(r.current, d)} → ${formatValue(r.target, d)} ${unit}`,
  };
}

export function Suggestions({ features, exposure, margin, holds, onApply }: Props) {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  // suggestions go stale as soon as the design changes
  useEffect(() => {
    setData(null);
    setState("idle");
  }, [features, exposure, margin]);

  const run = async () => {
    setState("loading");
    try {
      const res = await api.analyze({ features, exposure_minutes: exposure, margin_minutes: margin });
      setData(res);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const recs = (data?.recommendations ?? [])
    .filter((r) => r.expected_delta_frt > 0.5 && CONTROL_BY_KEY[r.feature])
    .sort((a, b) => b.expected_delta_frt - a.expected_delta_frt)
    .slice(0, 3);

  const applyAll = () => {
    const changes: Record<string, number> = {};
    for (const r of data?.recommendations ?? []) {
      if (data?.combination?.features.includes(r.feature)) changes[r.feature] = r.target;
    }
    onApply(changes);
  };

  return (
    <section className="border-t px-6 py-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Make it last longer</h3>
        {!data && (
          <button
            type="button"
            onClick={run}
            disabled={state === "loading"}
            className="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-surface-2 disabled:opacity-60"
          >
            {state === "loading" ? "Thinking…" : "Suggest changes"}
          </button>
        )}
      </div>

      {state === "error" && (
        <p className="mt-3 text-sm text-strength">Couldn&apos;t get suggestions. Try again in a moment.</p>
      )}

      {!data && state !== "error" && (
        <p className="mt-2 text-sm text-muted-foreground">
          {holds === false
            ? "Find the smallest changes that get this beam to the target."
            : "See which changes buy this beam the most time."}
        </p>
      )}

      {data && recs.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing in reach makes a real difference here. Try a different starting beam.
        </p>
      )}

      {data && recs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {recs.map((r) => {
            const d = describe(r);
            return (
              <li key={r.feature} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{d.text}</div>
                  <div className="tnum text-xs text-muted-foreground">{d.range}</div>
                </div>
                <span className="tnum text-sm font-semibold text-nofail">
                  +{Math.round(r.expected_delta_frt)} min
                </span>
                <button
                  type="button"
                  onClick={() => onApply({ [r.feature]: r.target })}
                  className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background transition-transform hover:-translate-y-px active:translate-y-0"
                >
                  Apply
                </button>
              </li>
            );
          })}
          {data.combination && data.combination.features.length > 1 && (
            <li className="pt-2">
              <button
                type="button"
                onClick={applyAll}
                className="w-full rounded-lg border border-dashed px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
              >
                Apply all together{" "}
                <span className="tnum text-nofail">+{Math.round(data.combination.expected_delta_frt)} min</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
