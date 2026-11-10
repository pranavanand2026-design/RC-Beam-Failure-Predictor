"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { useBeamIndex } from "@/hooks/useFeatureMeta";
import { MODES, MODE_INFO, formatBeamId, type FailureMode } from "@/lib/constants";
import type { IndexedBeam } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BeamSection } from "./BeamSection";
import { LoadingRing } from "@/components/layout/LoadingRing";

type Sort = "id" | "longest" | "shortest";
const PAGE = 60;
const MAX_MIN = 300;
const COLS = "grid-cols-[40px_120px_170px_minmax(0,1fr)_76px_150px_60px_116px]";

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const modeOf = (m: string): FailureMode => ((m as FailureMode) in MODE_INFO ? (m as FailureMode) : "Deflection Failure");
const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export function ExploreClient() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useBeamIndex();
  const [mode, setMode] = useState<FailureMode | "all">("all");
  const [query, setQuery] = useState("");
  const [insulated, setInsulated] = useState(false);
  const [withFrp, setWithFrp] = useState(false);
  const [sort, setSort] = useState<Sort>("id");
  const [shown, setShown] = useState(PAGE);

  const stats = useMemo(() => {
    const all = data ?? [];
    return Object.fromEntries(
      MODES.map((m) => {
        const rows = all.filter((b) => b.mode === m);
        return [m, { count: rows.length, share: all.length ? rows.length / all.length : 0, median: median(rows.map((r) => r.frt)) }];
      })
    ) as Record<FailureMode, { count: number; share: number; median: number }>;
  }, [data]);

  const rows = useMemo(() => {
    let r: IndexedBeam[] = data ?? [];
    if (mode !== "all") r = r.filter((b) => b.mode === mode);
    if (insulated) r = r.filter((b) => b.tins > 0 || b.hi > 0);
    if (withFrp) r = r.filter((b) => b.Af > 0);
    const q = query.trim().toLowerCase().replace(/[\s_·]+/g, "");
    if (q) r = r.filter((b) => b.id.toLowerCase().replace(/[\s_]+/g, "").includes(q));
    if (sort === "longest") r = [...r].sort((a, b) => b.frt - a.frt);
    if (sort === "shortest") r = [...r].sort((a, b) => a.frt - b.frt);
    return r;
  }, [data, mode, insulated, withFrp, query, sort]);

  const paged = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setShown(PAGE);
  };

  const total = data?.length ?? 21384;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-8 lg:px-10 lg:pt-14">
      <header className="animate-rise">
        <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.03em] lg:text-[44px]">
          {total.toLocaleString()} beams, tested in fire
        </h1>
        <p className="mt-2 text-base text-muted-foreground lg:text-lg">
          Pick an outcome, then open any beam in the studio.
        </p>
      </header>

      {isError ? (
        <div className="mt-10 rounded-2xl border bg-surface p-10 text-center">
          <p className="font-semibold">Can&apos;t reach the beam database right now.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <OutcomeBar
            loading={isLoading}
            total={total}
            stats={stats}
            mode={mode}
            onMode={paged(setMode)}
          />

          <div className="mt-6 overflow-hidden rounded-2xl border bg-surface">
            {/* toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b px-3 py-3 lg:flex-nowrap lg:px-4">
              <input
                value={query}
                onChange={(e) => paged(setQuery)(e.target.value)}
                placeholder="Search by beam number"
                className="h-9 w-full rounded-lg bg-surface-2 px-3 lg:w-64 text-sm outline-none ring-foreground/20 transition-shadow placeholder:text-muted-foreground focus:ring-2"
              />
              <Check on={insulated} onClick={() => paged(setInsulated)(!insulated)}>
                Insulated
              </Check>
              <Check on={withFrp} onClick={() => paged(setWithFrp)(!withFrp)}>
                Has FRP strip
              </Check>
              <span className="tnum ml-auto hidden text-sm text-muted-foreground lg:mr-3 lg:inline">
                {isLoading ? "" : `${rows.length.toLocaleString()} beams`}
              </span>
              <div className="flex items-center rounded-lg bg-surface-2 p-0.5 text-sm">
                {(
                  [
                    ["id", "Number"],
                    ["longest", "Longest"],
                    ["shortest", "Shortest"],
                  ] as [Sort, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => paged(setSort)(k)}
                    className={cn(
                      "rounded-md px-3 py-1.5 font-medium transition-colors",
                      sort === k ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* column headers */}
            <div className={cn("hidden items-end gap-4 border-b bg-surface-2/40 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid", COLS)}>
              <span />
              <span>Beam</span>
              <span>Failure mode</span>
              <span className="flex justify-between pr-[68px]">
                <span>Fire resistance</span>
                <span className="opacity-70">5 h</span>
              </span>
              <span className="text-right">Cover</span>
              <span className="text-right">Insulation under / sides</span>
              <span className="text-right">Load</span>
              <span />
            </div>

            {isLoading && (
              <div className="grid min-h-[320px] place-items-center px-6 py-12">
                <LoadingRing title="Loading 21,384 beams" />
              </div>
            )}
            {!isLoading && rows.length === 0 && (
              <div className="px-6 py-16 text-center text-muted-foreground">No beams match these filters.</div>
            )}

            {rows.slice(0, shown).map((b) => {
              const info = MODE_INFO[modeOf(b.mode)];
              const href = `/studio?beam=${encodeURIComponent(b.id)}`;
              const insul = b.tins > 0 || b.hi > 0;
              return (
<Fragment key={b.id}>
                <Link
                  key={`${b.id}-card`}
                  href={href}
                  className="flex gap-3 border-b px-3 py-3 last:border-0 active:bg-surface-2/60 lg:hidden"
                >
                  <BeamSection beam={b} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{formatBeamId(b.id)}</span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: tint(info.color, 13), color: `color-mix(in srgb, ${info.color} 75%, var(--foreground))` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
                        {info.label}
                      </span>
                    </span>
                    <span className="mt-2 flex items-center gap-2.5">
                      <span className="relative h-1.5 flex-1 rounded-full bg-surface-2">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${Math.min(100, (b.frt / MAX_MIN) * 100)}%`, background: info.color }}
                        />
                      </span>
                      <span className="tnum text-sm font-semibold">{Math.round(b.frt)} min</span>
                    </span>
                    <span className="tnum mt-1.5 block text-xs text-muted-foreground">
                      Cover {Math.round(b.Cc)} mm · {insul ? `Insulated ${Math.round(b.tins)}/${Math.round(b.hi)} mm` : "No insulation"} · Load {Math.round(b.LR)}%
                    </span>
                  </span>
                </Link>
                <div
                  key={`${b.id}-wide`}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(href)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(href)}
                  className={cn(
                    "group hidden cursor-pointer items-center gap-4 border-b px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-surface-2/50 lg:grid",
                    COLS
                  )}
                >
                  <BeamSection beam={b} />
                  <span className="font-semibold">{formatBeamId(b.id)}</span>
                  <span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium"
                      style={{ background: tint(info.color, 13), color: `color-mix(in srgb, ${info.color} 75%, var(--foreground))` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: info.color }} />
                      {info.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-3" title="Bar runs from 0 to 5 hours; ticks mark each hour">
                    <span className="relative h-2 flex-1 rounded-full bg-surface-2">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${Math.min(100, (b.frt / MAX_MIN) * 100)}%`, background: info.color }}
                      />
                      {[1, 2, 3, 4].map((hr) => (
                        <span key={hr} className="absolute inset-y-0 w-0.5 bg-surface" style={{ left: `${(hr * 60 * 100) / MAX_MIN}%` }} />
                      ))}
                    </span>
                    <span className="tnum w-14 text-right font-semibold">{Math.round(b.frt)} min</span>
                  </span>
                  <span className="tnum text-right">{Math.round(b.Cc)} mm</span>
                  <span className={cn("tnum text-right", !insul && "text-muted-foreground")}>
                    {insul ? `${Math.round(b.tins)} / ${Math.round(b.hi)} mm` : "None"}
                  </span>
                  <span className="tnum text-right">{Math.round(b.LR)}%</span>
                  <Link
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    className="justify-self-end rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    Open in studio
                  </Link>
                </div>
                </Fragment>
              );
            })}
          </div>

          {!isLoading && shown < rows.length && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE)}
                className="tnum rounded-full border bg-surface px-5 py-2 text-sm font-semibold transition-colors hover:bg-surface-2"
              >
                Show more · {Math.min(shown, rows.length).toLocaleString()} of {rows.length.toLocaleString()}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Proportional outcome strip that doubles as the filter. */
function OutcomeBar({
  loading,
  total,
  stats,
  mode,
  onMode,
}: {
  loading: boolean;
  total: number;
  stats: Record<FailureMode, { count: number; share: number; median: number }>;
  mode: FailureMode | "all";
  onMode: (m: FailureMode | "all") => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border bg-surface px-4 pb-4 pt-5 lg:mt-10 lg:px-6 lg:pb-5 lg:pt-6">
      <div className="flex h-3 gap-1">
        {MODES.map((m) => {
          const on = mode === "all" || mode === m;
          return (
            <button
              key={m}
              type="button"
              aria-label={`Show ${MODE_INFO[m].label}`}
              onClick={() => onMode(mode === m ? "all" : m)}
              className="h-full rounded-full transition-all hover:brightness-110"
              style={{
                flexGrow: loading ? 1 : Math.max(stats[m].share, 0.015),
                flexBasis: 0,
                background: loading ? "var(--surface-2)" : MODE_INFO[m].color,
                opacity: on ? 1 : 0.2,
              }}
            />
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-y-5 lg:grid-cols-[1fr_1.4fr_1.4fr_1.4fr] lg:gap-y-0 lg:divide-x">
        <FilterCell active={mode === "all"} onClick={() => onMode("all")} first>
          <span className="text-sm font-medium text-muted-foreground">All beams</span>
          <span className="tnum mt-1 block text-xl font-bold tracking-tight lg:text-2xl">{total.toLocaleString()}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">Every outcome</span>
        </FilterCell>
        {MODES.map((m) => {
          const st = stats[m];
          return (
            <FilterCell key={m} active={mode === m} onClick={() => onMode(mode === m ? "all" : m)}>
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: MODE_INFO[m].color }} />
                {MODE_INFO[m].label}
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="tnum text-xl font-bold tracking-tight lg:text-2xl">{loading ? "…" : st.count.toLocaleString()}</span>
                {!loading && <span className="tnum text-sm text-muted-foreground">{Math.round(st.share * 100)}%</span>}
              </span>
              {!loading && (
                <span className="tnum mt-0.5 block text-sm text-muted-foreground">
                  {m === "No Failure" ? "Survived the full 5 hours" : `Median ${st.median} min`}
                </span>
              )}
            </FilterCell>
          );
        })}
      </div>
    </section>
  );
}

function FilterCell({
  active,
  onClick,
  first,
  children,
}: {
  active: boolean;
  onClick: () => void;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative pb-3 text-left transition-opacity",
        first ? "pr-3 lg:pr-5" : "pr-3 lg:px-5",
        active ? "opacity-100" : "opacity-55 hover:opacity-100"
      )}
    >
      {children}
      {active && <span className={cn("absolute bottom-0 right-3 h-0.5 rounded-full bg-foreground lg:right-5", first ? "left-0" : "left-0 lg:left-5")} />}
    </button>
  );
}

function Check({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "grid h-3.5 w-3.5 place-items-center rounded-[4px] border text-[10px] leading-none",
          on ? "border-background bg-background text-foreground" : "border-muted-foreground/50"
        )}
      >
        {on ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}
