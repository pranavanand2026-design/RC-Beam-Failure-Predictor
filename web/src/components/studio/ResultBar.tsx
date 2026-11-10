"use client";

import { MODE_INFO, iso834, type FailureMode } from "@/lib/constants";
import type { FirePhase } from "@/hooks/useFireTest";
import type { PlaygroundResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  prediction: PlaygroundResponse | null;
  exposure: number;
  margin: number;
  phase: FirePhase;
  clock: number;
  pending: boolean;
  onRun: () => void;
}

const modeInfo = (m: string) => MODE_INFO[(m as FailureMode) in MODE_INFO ? (m as FailureMode) : "Deflection Failure"];

export function ResultBar({ prediction, exposure, margin, phase, clock, pending, onRun }: Props) {
  const p = prediction;
  const threshold = exposure + margin;
  const frt = p ? Math.round(p.frt_minutes) : null;
  const holds = p ? p.gap_minutes >= 0 : null;
  const mode = p ? modeInfo(p.predicted_mode) : null;
  const modeProb = p ? Math.round((p.probabilities[p.predicted_mode] ?? 0) * 100) : null;

  const scaleMax = Math.min(320, Math.max(60, Math.max(threshold, frt ?? 0) * 1.18));
  const pct = (m: number) => `${Math.min(100, (m / scaleMax) * 100)}%`;
  const failColor = p
    ? p.predicted_mode === "No Failure"
      ? "var(--deflection)"
      : modeInfo(p.predicted_mode).color
    : "var(--muted-foreground)";

  return (
    <div
      data-tour="verdict"
      className="pointer-events-auto rounded-xl border bg-surface/92 p-5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md"
    >
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-2xl font-bold tracking-tight transition-opacity",
              pending && "opacity-60"
            )}
          >
            {!p && "Working it out…"}
            {p && holds && (
              <>
                Holds past <span className="text-nofail">{threshold} min</span>
              </>
            )}
            {p && !holds && (
              <>
                Gives way at <span style={{ color: failColor }}>~{frt} min</span>
              </>
            )}
          </div>
          {p && (
            <p className="mt-1 text-sm text-muted-foreground">
              Predicted to last <span className="tnum font-semibold text-foreground">{frt} min</span>
              {" · "}needs {threshold} min ({exposure} + {margin} safety)
            </p>
          )}
        </div>

        <button
          type="button"
          data-tour="run"
          onClick={onRun}
          disabled={!p || phase === "running"}
          className={cn(
            "shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition-all",
            "hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
          )}
        >
          {phase === "running" ? "Burning…" : phase === "idle" ? "Run fire test" : "Run again"}
        </button>
      </div>

      {/* fire timeline */}
      <div className="mt-5">
        <div className="relative h-2 rounded-full bg-surface-2">
          {p && (
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
              style={{ width: pct(p.frt_minutes), background: holds ? "var(--nofail)" : failColor }}
            />
          )}
          <div
            className="absolute -top-1.5 h-5 w-0.5 rounded-full bg-foreground"
            style={{ left: pct(threshold) }}
          />
          {phase !== "idle" && (
            <div
              className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-surface bg-accent shadow"
              style={{ left: pct(clock) }}
            />
          )}
        </div>
        <div className="relative mt-2 h-4 text-xs text-muted-foreground">
          <span className="absolute left-0">0 min</span>
          <span className="absolute -translate-x-1/2 font-medium text-foreground" style={{ left: pct(threshold) }}>
            Target {threshold}
          </span>
          <span className="absolute right-0">{Math.round(scaleMax)} min</span>
        </div>
      </div>

      {p && mode && (
        <div className="mt-4 flex items-center gap-2 border-t pt-4 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: mode.color }} />
          {p.predicted_mode === "No Failure" ? (
            <span>
              Likely to <span className="font-semibold">hold through a full 5-hour test</span>
            </span>
          ) : (
            <span>
              When it fails, it most likely <span className="font-semibold">{mode.verb.toLowerCase()}</span>
            </span>
          )}
          <span className="tnum ml-auto text-muted-foreground">{modeProb}% likely</span>
        </div>
      )}
    </div>
  );
}

export function FireClock({ phase, clock, failedMode }: { phase: FirePhase; clock: number; failedMode: string | null }) {
  if (phase === "idle") return null;
  const t = Math.round(clock);
  const temp = Math.round(iso834(clock));
  let title: React.ReactNode = `${t} min`;
  let sub = `Furnace at ${temp.toLocaleString()} °C`;
  if (phase === "failed") {
    const info = modeInfo(failedMode ?? "Deflection Failure");
    title = <span style={{ color: info.color }}>{info.short} at {t} min</span>;
    sub = failedMode === "Strength Failure" ? "Lost the strength to carry its load" : "Bent past the safe limit";
  }
  if (phase === "held") {
    title = <span className="text-nofail">Held for {t} min</span>;
    sub = `Furnace reached ${temp.toLocaleString()} °C`;
  }
  return (
    <div className="pointer-events-none text-right">
      <div className="tnum text-4xl font-bold tracking-tight">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
