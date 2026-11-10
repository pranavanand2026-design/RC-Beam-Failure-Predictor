"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useBeamIndex } from "@/hooks/useFeatureMeta";
import { MODE_INFO, formatBeamId, type FailureMode } from "@/lib/constants";
import type { IndexedBeam } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  beamId: string | null;
  onPick: (id: string | null) => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_·]+/g, "");

type Option = { key: string; id: string | null; title: string; hint?: string; beam?: IndexedBeam };

export function BeamPicker({ beamId, onPick }: Props) {
  const { data: index } = useBeamIndex();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const pos = useMemo(() => (index && beamId ? index.findIndex((b) => b.id === beamId) : -1), [index, beamId]);
  const prev = index && pos > 0 ? index[pos - 1].id : null;
  const next = index ? (pos >= 0 ? index[pos + 1]?.id ?? null : index[0]?.id ?? null) : null;

  // a few starting points so an empty search still has somewhere to go
  const suggestions = useMemo<Option[]>(() => {
    if (!index?.length) return [];
    const pick = (rows: IndexedBeam[]) => rows[Math.floor(Math.random() * rows.length)];
    const fastest = index.reduce((a, b) => (b.frt < a.frt ? b : a));
    return [
      { key: "typical", id: null, title: "Typical beam", hint: "Average values from the dataset" },
      { key: "held", id: pick(index.filter((b) => b.mode === "No Failure")).id, title: "One that lasted the full test" },
      { key: "strength", id: pick(index.filter((b) => b.mode === "Strength Failure")).id, title: "One with a strength failure" },
      { key: "fastest", id: fastest.id, title: "The one that failed fastest" },
      { key: "random", id: pick(index).id, title: "Surprise me" },
    ];
    // re-roll the random picks each time the menu opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, open]);

  const options = useMemo<Option[]>(() => {
    const q = norm(query);
    if (!q) return suggestions;
    return (index ?? [])
      .filter((b) => norm(b.id).includes(q))
      .slice(0, 8)
      .map((b) => ({ key: b.id, id: b.id, title: formatBeamId(b.id), beam: b }));
  }, [query, index, suggestions]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (o: Option | undefined) => {
    if (!o) return;
    setOpen(false);
    setQuery("");
    onPick(o.id);
  };

  const toggle = () => {
    setOpen((o) => !o);
    setActive(0);
    setQuery("");
    requestAnimationFrame(() => input.current?.focus());
  };

  return (
    <div ref={root} className="pointer-events-auto relative">
      <div className="flex items-stretch rounded-xl border bg-surface/90 shadow-sm backdrop-blur">
        <StepButton label="Previous beam" disabled={!prev} onClick={() => onPick(prev)}>
          ‹
        </StepButton>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-[168px] items-center justify-between gap-6 border-x px-4 py-2 text-left transition-colors hover:bg-surface-2/60"
        >
          <span>
            <span className="block text-[11px] font-medium text-muted-foreground">
              {beamId ? `Beam ${pos >= 0 ? `${(pos + 1).toLocaleString()} of ${index?.length.toLocaleString()}` : ""}` : "Starting from"}
            </span>
            <span className="block text-[15px] font-semibold leading-tight">
              {beamId ? formatBeamId(beamId) : "Typical beam"}
            </span>
          </span>
          <span className={cn("text-muted-foreground transition-transform", open && "rotate-180")}>▾</span>
        </button>
        <StepButton label="Next beam" disabled={!next} onClick={() => onPick(next)}>
          ›
        </StepButton>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[340px] overflow-hidden rounded-xl border bg-surface shadow-[0_18px_50px_-18px_rgba(0,0,0,0.35)]">
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, options.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") choose(options[active]);
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Type a beam number, e.g. B120"
            className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <ul className="max-h-80 overflow-y-auto p-1.5">
            {!query && <li className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">Jump to</li>}
            {options.map((o, i) => {
              const info = o.beam && (o.beam.mode as FailureMode) in MODE_INFO ? MODE_INFO[o.beam.mode as FailureMode] : null;
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm",
                      i === active && "bg-surface-2"
                    )}
                  >
                    {info && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: info.color }} />}
                    <span className="flex-1">
                      <span className="block font-medium">{o.title}</span>
                      {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                    </span>
                    {o.beam && <span className="tnum text-xs text-muted-foreground">{Math.round(o.beam.frt)} min</span>}
                  </button>
                </li>
              );
            })}
            {query && options.length === 0 && (
              <li className="px-2.5 py-6 text-center text-sm text-muted-foreground">No beam matches “{query}”</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="w-9 text-lg text-muted-foreground transition-colors hover:bg-surface-2/60 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
