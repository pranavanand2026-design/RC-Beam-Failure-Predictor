"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useBeamIndex } from "@/hooks/useFeatureMeta";
import { MODES, MODE_INFO, type FailureMode } from "@/lib/constants";
import type { IndexedBeam } from "@/lib/types";
import { cn } from "@/lib/utils";

type Sort = "id" | "longest" | "shortest";
const PAGE = 60;
const MAX_MIN = 300;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const OUTCOME: Record<FailureMode, string> = {
  "Deflection Failure": "Sagged",
  "Strength Failure": "Broke",
  "No Failure": "Held",
};

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
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    if (q) r = r.filter((b) => b.id.toLowerCase().replace(/\s+/g, "").includes(q));
    if (sort === "longest") r = [...r].sort((a, b) => b.frt - a.frt);
    if (sort === "shortest") r = [...r].sort((a, b) => a.frt - b.frt);
    return r;
  }, [data, mode, insulated, withFrp, query, sort]);

  const resetPaging = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setShown(PAGE);
  };

  const total = data?.length ?? 21384;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-10 pb-20 pt-14">
      <div className="max-w-2xl animate-rise">
        <h1 className="text-5xl font-extrabold tracking-[-0.03em]">
          {total.toLocaleString()} beams, tested in fire
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Each one went through a standard fire test. Filter by how it failed, then open any of them in the
          studio.
        </p>
      </div>

      {isError && (
        <div className="mt-10 rounded-xl border bg-surface p-8 text-center">
          <p className="font-semibold">Can&apos;t reach the beam database right now.</p>
          <button type="button" onClick={() => refetch()} className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background">
            Try again
          </button>
        </div>
      )}

      {!isError && (
        <>
          {/* outcome tiles double as the filter */}
          <div className="mt-10 grid grid-cols-4 gap-3">
            <Tile
              active={mode === "all"}
              onClick={() => resetPaging(setMode)("all")}
              label="All beams"
              value={isLoading ? "…" : total.toLocaleString()}
              sub="Every outcome"
            />
            {MODES.map((m) => (
              <Tile
                key={m}
                active={mode === m}
                onClick={() => resetPaging(setMode)(m)}
                label={OUTCOME[m]}
                color={MODE_INFO[m].color}
                value={isLoading ? "…" : stats[m].count.toLocaleString()}
                sub={
                  isLoading
                    ? ""
                    : m === "No Failure"
                      ? `${Math.round(stats[m].share * 100)}% · lasted the full 5 hours`
                      : `${Math.round(stats[m].share * 100)}% · typically at ${stats[m].median} min`
                }
              />
            ))}
          </div>

          {/* toolbar */}
          <div className="mt-8 flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => resetPaging(setQuery)(e.target.value)}
              placeholder="Find a beam, e.g. I3 B120"
              className="h-10 w-72 rounded-full border bg-surface px-4 text-sm outline-none transition-colors focus:border-foreground"
            />
            <Toggle on={insulated} onClick={() => resetPaging(setInsulated)(!insulated)}>
              Insulated
            </Toggle>
            <Toggle on={withFrp} onClick={() => resetPaging(setWithFrp)(!withFrp)}>
              With FRP strip
            </Toggle>
            <div className="ml-auto flex items-center gap-1 rounded-full bg-surface-2 p-1 text-sm">
              {(
                [
                  ["id", "Beam number"],
                  ["longest", "Lasted longest"],
                  ["shortest", "Failed fastest"],
                ] as [Sort, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => resetPaging(setSort)(k)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-medium transition-colors",
                    sort === k ? "bg-surface shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* list */}
          <div className="mt-5 overflow-hidden rounded-xl border bg-surface">
            <div className="grid grid-cols-[160px_130px_minmax(0,1fr)_110px_160px_110px_150px] gap-4 border-b px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Beam</span>
              <span>Outcome</span>
              <span>Lasted</span>
              <span className="text-right">Cover</span>
              <span className="text-right">Insulation</span>
              <span className="text-right">Load</span>
              <span />
            </div>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[52px] animate-pulse border-b bg-surface-2/40 last:border-0" />
              ))}
            {!isLoading && rows.length === 0 && (
              <div className="px-6 py-14 text-center text-muted-foreground">No beams match these filters.</div>
            )}
            {rows.slice(0, shown).map((b) => {
              const m = (b.mode as FailureMode) in MODE_INFO ? (b.mode as FailureMode) : "Deflection Failure";
              const info = MODE_INFO[m];
              const href = `/studio?beam=${encodeURIComponent(b.id)}`;
              return (
                <div
                  key={b.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(href)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(href)}
                  className="group grid cursor-pointer grid-cols-[160px_130px_minmax(0,1fr)_110px_160px_110px_150px] items-center gap-4 border-b px-6 py-3.5 text-sm transition-colors last:border-0 hover:bg-surface-2/60"
                >
                  <span className="font-semibold">{b.id}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: info.color }} />
                    {OUTCOME[m]}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${Math.min(100, (b.frt / MAX_MIN) * 100)}%`, background: info.color }}
                      />
                    </span>
                    <span className="tnum w-16 text-right font-medium">{Math.round(b.frt)} min</span>
                  </span>
                  <span className="tnum text-right text-muted-foreground">{Math.round(b.Cc)} mm</span>
                  <span className="tnum text-right text-muted-foreground">
                    {b.tins > 0 || b.hi > 0 ? `${Math.round(b.tins)} / ${Math.round(b.hi)} mm` : "None"}
                  </span>
                  <span className="tnum text-right text-muted-foreground">{Math.round(b.LR)}%</span>
                  <Link
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    className="justify-self-end text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    Open in studio →
                  </Link>
                </div>
              );
            })}
          </div>

          {!isLoading && rows.length > 0 && (
            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <span className="tnum">
                {Math.min(shown, rows.length).toLocaleString()} of {rows.length.toLocaleString()}
              </span>
              {shown < rows.length && (
                <button
                  type="button"
                  onClick={() => setShown((s) => s + PAGE)}
                  className="rounded-full border bg-surface px-5 py-2 font-semibold text-foreground transition-colors hover:bg-surface-2"
                >
                  Show more
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  active,
  onClick,
  label,
  value,
  sub,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border p-5 text-left transition-all hover:-translate-y-0.5",
        active ? "border-foreground bg-surface shadow-sm" : "bg-surface/50 hover:bg-surface"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="tnum mt-3 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
        on ? "border-foreground bg-foreground text-background" : "bg-surface hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}
