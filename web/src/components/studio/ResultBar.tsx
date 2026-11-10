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

const modeInfo = (m: string) =>
  MODE_INFO[(m as FailureMode) in MODE_INFO ? (m as FailureMode) : "Deflection Failure"];

/** The dial is one full standard test: five hours. */
const DIAL_MIN = 300;

export function ResultBar({ prediction, exposure, margin, phase, clock, pending, onRun }: Props) {
  const p = prediction;
  const threshold = exposure + margin;
  const holds = p ? p.gap_minutes >= 0 : null;
  const mode = p ? modeInfo(p.predicted_mode) : null;
  const prob = p ? Math.round((p.probabilities[p.predicted_mode] ?? 0) * 100) : null;
  const arcColor = !p ? "var(--border)" : holds ? "var(--nofail)" : modeInfo(p.predicted_mode === "No Failure" ? "Deflection Failure" : p.predicted_mode).color;

  const detail = p
    ? `Predicted fire resistance ${Math.round(p.frt_minutes)} min. Target ${threshold} min (${exposure} exposure + ${margin} safety margin). The full dial is a 5-hour test.`
    : undefined;

  return (
    <div
      data-tour="verdict"
      title={detail}
      className="pointer-events-auto flex items-center gap-4 rounded-2xl border bg-surface/92 p-3 pr-4 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.28)] backdrop-blur-md"
    >
      <Dial
        frt={p?.frt_minutes ?? 0}
        target={threshold}
        clock={clock}
        running={phase !== "idle"}
        color={arcColor}
        dim={pending}
      />

      <div className={cn("min-w-0 flex-1 transition-opacity", pending && "opacity-60")}>
        <div className="text-lg font-bold leading-tight tracking-tight">
          {!p && "Working it out…"}
          {p && holds && <>Passes {exposure} min</>}
          {p && !holds && (
            <>
              <span style={{ color: arcColor }}>{Math.round(Math.abs(p.gap_minutes))} min</span> short of {exposure}
            </>
          )}
        </div>
        {p && mode && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: mode.color }} />
            {mode.label}
            <span className="tnum">· {prob}%</span>
          </div>
        )}
      </div>

      <button
        type="button"
        data-tour="run"
        onClick={onRun}
        disabled={!p || phase === "running"}
        className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {phase === "running" ? "Burning…" : phase === "idle" ? "Run fire test" : "Run again"}
      </button>
    </div>
  );
}

function Dial({
  frt,
  target,
  clock,
  running,
  color,
  dim,
}: {
  frt: number;
  target: number;
  clock: number;
  running: boolean;
  color: string;
  dim: boolean;
}) {
  const size = 76;
  const r = 31;
  const c = 2 * Math.PI * r;
  const frac = (m: number) => Math.min(1, Math.max(0, m / DIAL_MIN));
  const angle = (m: number) => frac(m) * 360 - 90;
  const at = (m: number, rad: number) => {
    const a = (angle(m) * Math.PI) / 180;
    return [size / 2 + Math.cos(a) * rad, size / 2 + Math.sin(a) * rad];
  };
  const [tx1, ty1] = at(target, r - 7);
  const [tx2, ty2] = at(target, r + 7);
  const [hx, hy] = at(clock, r - 4);
  const shown = running ? clock : frt;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={cn("transition-opacity", dim && "opacity-60")}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${frac(frt) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 300ms ease, stroke 300ms ease", opacity: running ? 0.35 : 1 }}
        />
        {running && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={6}
            strokeDasharray={`${frac(clock) * c} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round" />
        {running && (
          <line x1={size / 2} y1={size / 2} x2={hx} y2={hy} stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" />
        )}
      </svg>
      {!running && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="tnum text-xl font-bold tracking-tight">{Math.round(shown)}</span>
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">min</span>
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
    title = <span style={{ color: info.color }}>{info.label} at {t} min</span>;
    sub = failedMode === "Strength Failure" ? "Could no longer carry its load" : "Deflected past the safe limit";
  }
  if (phase === "held") {
    title = <span className="text-nofail">Survived {t} min</span>;
    sub = `Furnace reached ${temp.toLocaleString()} °C`;
  }
  return (
    <div className="pointer-events-none text-right">
      <div className="tnum text-4xl font-bold tracking-tight">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
