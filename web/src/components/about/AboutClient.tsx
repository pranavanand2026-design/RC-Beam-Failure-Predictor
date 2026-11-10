"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { BeamViewer } from "@/components/beam";
import { useDemoLoop } from "@/hooks/useDemoLoop";
import type { BeamParams } from "@/lib/beamGeometry";
import { MODE_INFO, iso834, type FailureMode } from "@/lib/constants";

const BEAM: BeamParams = { L: 3160, Ac: 90000, Cc: 25, As: 387.9, Af: 91.8, tins: 25, hi: 38, LR: 56.6 };

const ENDINGS: {
  mode: FailureMode;
  title: string;
  what: string;
  impact: string;
  share: string;
  when: string;
}[] = [
  {
    mode: "Deflection Failure",
    title: "Deflection failure",
    what: "Heat softens the steel and concrete, so the beam bends further and further until it passes the safe deflection limit.",
    impact: "Floors above crack and dip, and gaps open for fire and smoke to spread. It's gradual, so there is some warning.",
    share: "86% of beams",
    when: "typically at 80 min",
  },
  {
    mode: "Strength Failure",
    title: "Strength failure",
    what: "The steel gets hot enough that the beam can no longer carry its load, and it gives way at once.",
    impact: "Sudden collapse with little warning. The most dangerous outcome for people inside and for firefighters.",
    share: "11% of beams",
    when: "typically at 50 min",
  },
  {
    mode: "No Failure",
    title: "No failure",
    what: "Enough cover, insulation and a modest load keep the steel cool for the whole test.",
    impact: "The structure stays up and the fire stays in its room, giving everyone time to get out.",
    share: "2% of beams",
    when: "lasted the full 5 hours",
  },
];

// Strength retained by each material as it heats (EN 1992-1-2 and typical FRP adhesives).
const THRESHOLDS = [
  { t: 80, label: "FRP adhesive softens", note: "70–90 °C" },
  { t: 300, label: "Concrete loses 15% of its strength", note: "300 °C" },
  { t: 500, label: "Steel down to ~80%", note: "500 °C" },
  { t: 600, label: "Steel down to about half", note: "600 °C" },
];

const MINUTES = [5, 30, 60, 120];

// medians computed from data/processed/dataset.parquet (21,384 labelled beams)
const LEVERS: { title: string; note: string; rows: [string, number, boolean][] }[] = [
  {
    title: "Thicker cover",
    note: "More concrete between the flames and the steel",
    rows: [
      ["30 mm or more", 130, true],
      ["20 mm or less", 45, false],
    ],
  },
  {
    title: "Lighter load",
    note: "Strength failures drop from 21% to 3%",
    rows: [
      ["Under 50% of capacity", 145, true],
      ["60% or more", 50, false],
    ],
  },
  {
    title: "Insulation",
    note: "Every beam that lasted the full test was insulated",
    rows: [
      ["Insulated", 75, true],
      ["Bare", 55, false],
    ],
  },
];
const T_MAX = 1100;

export function AboutClient() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-10 pb-24 pt-14">
      <header className="max-w-3xl animate-rise">
        <h1 className="text-[56px] font-extrabold leading-[1.04] tracking-[-0.035em]">
          A fire doesn&apos;t break a beam all at once.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Heat creeps up from below and the materials weaken. Every beam in the dataset ended in one of three failure modes.
        </p>
      </header>

      {/* three endings */}
      <section className="mt-14 grid grid-cols-3 gap-5">
        {ENDINGS.map((e, i) => (
          <Ending key={e.mode} {...e} dark={dark} offset={i * 0.6} />
        ))}
      </section>

      {/* what the heat does */}
      <section className="mt-28">
        <h2 className="text-4xl font-extrabold tracking-[-0.03em]">What the heat does</h2>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Test furnaces follow a standard fire curve. It is hotter than most people expect, and it gets there fast.
        </p>
        <HeatScale />
      </section>

      {/* levers, backed by the dataset */}
      <section className="mt-28 grid grid-cols-[1fr_2fr] gap-16">
        <div>
          <h2 className="text-4xl font-extrabold tracking-[-0.03em]">What buys time</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Median fire resistance across the 21,384 tested beams.
          </p>
          <Link
            href="/studio"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-accent-foreground transition-all hover:-translate-y-px hover:shadow-md"
          >
            Try them in the studio
          </Link>
        </div>
        <div className="space-y-10">
          {LEVERS.map((l) => (
            <div key={l.title}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold tracking-tight">{l.title}</h3>
                <span className="text-sm text-muted-foreground">{l.note}</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {l.rows.map(([label, min, strong]) => (
                  <div key={label} className="grid grid-cols-[150px_1fr_70px] items-center gap-4 text-sm">
                    <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(Number(min) / 160) * 100}%`,
                          background: strong ? "var(--foreground)" : "var(--muted-foreground)",
                          opacity: strong ? 1 : 0.45,
                        }}
                      />
                    </span>
                    <span className="tnum text-right font-semibold">{min} min</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* model */}
      <section className="mt-28 max-w-3xl">
        <h2 className="text-3xl font-extrabold tracking-[-0.03em]">Where the predictions come from</h2>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Two models learned from the Bhatt, Kodur and Naser dataset of simulated fire tests on FRP-strengthened
          beams. One names the failure mode and gets it right{" "}
          <span className="font-semibold text-foreground">91%</span> of the time. The other estimates the time,
          usually to within <span className="font-semibold text-foreground">about 9 minutes</span>. Beams from the
          same study were never split between training and testing, so those scores hold up on beams the models
          haven&apos;t seen.
        </p>
        <a
          href="https://github.com/pranavanand2026-design/rc_beam-risk_model/blob/main/docs/RC_Beam_Report.pdf"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block text-sm font-semibold underline decoration-border decoration-2 underline-offset-4 hover:decoration-accent"
        >
          Read the full report →
        </a>
      </section>
    </div>
  );
}

function Ending({
  mode,
  title,
  what,
  impact,
  share,
  when,
  dark,
  offset,
}: (typeof ENDINGS)[number] & { dark: boolean; offset: number }) {
  const sim = useDemoLoop(mode, offset);
  const info = MODE_INFO[mode];
  return (
    <article className="overflow-hidden rounded-2xl border bg-surface transition-transform hover:-translate-y-0.5">
      <div className="relative h-64 bg-stage">
        <BeamViewer params={BEAM} simRef={sim} dark={dark} interactive={false} zoom={0.66} className="!absolute inset-0" />
      </div>
      <div className="p-7">
        <h3 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: info.color }} />
          {title}
        </h3>
        <p className="mt-2 leading-relaxed">{what}</p>
        <p className="mt-3 leading-relaxed text-muted-foreground">{impact}</p>
        <div className="tnum mt-5 flex gap-4 border-t pt-4 text-sm">
          <span className="font-semibold">{share}</span>
          <span className="text-muted-foreground">{when}</span>
        </div>
      </div>
    </article>
  );
}

function HeatScale() {
  const pct = (t: number) => `${(t / T_MAX) * 100}%`;
  return (
    <div className="mt-12">
      {/* material thresholds above the bar */}
      <div className="relative h-24">
        {THRESHOLDS.map((m, i) => (
          <div
            key={m.label}
            className="absolute bottom-0 flex flex-col items-start"
            style={{ left: pct(m.t), transform: i === 0 ? "none" : "translateX(-1px)" }}
          >
            <div className="whitespace-nowrap text-sm font-semibold" style={{ marginBottom: i % 2 ? 28 : 6 }}>
              {m.label}
              <span className="ml-2 font-normal text-muted-foreground">{m.note}</span>
            </div>
            <div className="w-px bg-foreground/40" style={{ height: i % 2 ? 40 : 18 }} />
          </div>
        ))}
      </div>

      <div
        className="h-4 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, #f3e7c9 0%, #f6c66a 20%, #f28a2e 45%, #e2531f 70%, #b8261a 100%)",
        }}
      />

      {/* fire clock below the bar */}
      <div className="relative mt-2 h-20">
        {MINUTES.map((m) => {
          const t = iso834(m);
          return (
            <div key={m} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(t) }}>
              <div className="mx-auto h-3 w-px bg-foreground/40" />
              <div className="tnum mt-1 whitespace-nowrap text-lg font-bold">{m} min</div>
              <div className="tnum text-xs text-muted-foreground">{Math.round(t)} °C</div>
            </div>
          );
        })}
        <div className="absolute left-0 top-4 text-xs text-muted-foreground">20 °C</div>
      </div>
    </div>
  );
}
