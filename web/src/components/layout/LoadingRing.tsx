"use client";

import { useEffect, useState } from "react";
import { markWarmupStart, warmupStartedAt } from "@/lib/warmup";

/** Measured cold start of the API on Cloud Run (~10 s); the ring eases toward this. */
const EXPECTED_MS = 12000;
const SHOW_AFTER_MS = 500;

/**
 * Circular progress for waking the API. The percentage is an estimate from elapsed
 * time (the server can't report its own boot progress); it never claims 100% until
 * the data has actually arrived, at which point this component unmounts.
 */
export function LoadingRing({
  title = "Waking up the model",
  note = "Free hosting sleeps when nobody's using it, so the first visit takes a little longer.",
}: {
  title?: string;
  note?: string;
}) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    markWarmupStart();
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  const start = warmupStartedAt();
  const elapsed = start === null || now === 0 ? 0 : Math.max(0, now - start);
  if (elapsed < SHOW_AFTER_MS) return null;

  const progress = Math.min(0.97, 1 - Math.exp(-elapsed / (EXPECTED_MS / 3)));
  const pct = Math.round(progress * 100);
  const size = 96;
  const r = 40;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={7} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${progress * c} ${c}`}
            style={{ transition: "stroke-dasharray 120ms linear" }}
          />
        </svg>
        <span className="tnum absolute inset-0 grid place-items-center text-xl font-bold tracking-tight">
          {pct}%
        </span>
      </div>
      <div className="mt-4 font-semibold">{title}…</div>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
