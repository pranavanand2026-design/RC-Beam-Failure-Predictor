"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { BeamViewer } from "@/components/beam";
import { useDemoLoop } from "@/hooks/useDemoLoop";
import type { BeamParams } from "@/lib/beamGeometry";

const TYPICAL: BeamParams = {
  L: 3160,
  Ac: 90000,
  Cc: 25,
  As: 387.9,
  Af: 91.8,
  tins: 25,
  hi: 38,
  LR: 56.6,
};

const STEPS = [
  {
    n: "01",
    title: "Pick a beam",
    body: "Start from a typical beam, or any of the 21,384 that were tested.",
    href: "/explore",
    cta: "Browse beams",
  },
  {
    n: "02",
    title: "Shape it",
    body: "Change the cover, insulation, steel and load. The beam and the prediction update as you go.",
    href: "/studio",
    cta: "Open the studio",
  },
  {
    n: "03",
    title: "Light the fire",
    body: "Run the fire test and see when it gives way, and whether it sags or breaks.",
    href: "/about",
    cta: "How beams fail",
  },
];

export default function Home() {
  const { resolvedTheme } = useTheme();
  const sim = useDemoLoop("Deflection Failure");

  return (
    <section className="relative flex h-[calc(100vh-3.5rem)] min-h-[680px] flex-col overflow-hidden">
      <div className="absolute top-0 right-0 bottom-[170px] w-[64%]">
        <BeamViewer
          params={TYPICAL}
          simRef={sim}
          dark={resolvedTheme === "dark"}
          autoRotate
          interactive={false}
          zoom={0.95}
          className="!absolute inset-0"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-10">
        <div className="mt-[11vh] max-w-[540px] animate-rise">
          <h1 className="text-[64px] font-extrabold leading-[1.02] tracking-[-0.035em]">
            Set a beam on fire.
            <br />
            <span className="text-accent">See how it fails.</span>
          </h1>
          <p className="mt-6 max-w-[460px] text-lg leading-relaxed text-muted-foreground">
            Shape a reinforced concrete beam, then watch a model trained on 21,384 fire tests
            predict how long it lasts.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/studio"
              className="rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-accent-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
            >
              Open the studio
            </Link>
            <Link
              href="/explore"
              className="rounded-full border bg-surface/60 px-6 py-3 text-[15px] font-semibold backdrop-blur transition-all hover:-translate-y-px hover:bg-surface active:translate-y-0"
            >
              Explore the beams
            </Link>
          </div>
        </div>

        <ol className="mt-auto mb-10 grid grid-cols-3 gap-10 border-t pt-8">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="animate-rise"
              style={{ animationDelay: `${150 + i * 90}ms` }}
            >
              <Link href={s.href} className="group block">
                <div className="tnum text-sm font-semibold text-accent">{s.n}</div>
                <div className="mt-2 text-xl font-bold tracking-tight">{s.title}</div>
                <p className="mt-1.5 max-w-[340px] text-[15px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
                <span className="mt-3 inline-block text-sm font-semibold underline decoration-border decoration-2 underline-offset-4 transition-colors group-hover:decoration-accent">
                  {s.cta} →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
