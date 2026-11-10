"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BeamViewer } from "@/components/beam";
import { useDemoLoop } from "@/hooks/useDemoLoop";
import type { BeamParams } from "@/lib/beamGeometry";
import type { BeamPart } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
    title: "Pick a beam",
    body: "Start from a typical beam, or any of the 21,384 that were tested.",
    href: "/explore",
    cta: "Browse beams",
  },
  {
    title: "Shape it",
    body: "Change the cover, insulation, steel and load. The beam and the prediction update as you go.",
    href: "/studio",
    cta: "Open the studio",
  },
  {
    title: "Light the fire",
    body: "Run the fire test and see when the beam fails, and which failure mode it hits.",
    href: "/about",
    cta: "How beams fail",
  },
];

const PARTS: BeamPart[] = ["cover", "insulation", "steel", "frp", "load"];
const STEP_MS = 6000;

export default function Home() {
  const { resolvedTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [part, setPart] = useState(0);
  const sim = useDemoLoop("Deflection Failure", 0.9, step === 2);

  // the steps take turns driving the model
  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), step === 2 ? 9000 : STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, paused]);

  // "Shape it" lights up one part of the beam after another
  useEffect(() => {
    if (step !== 1) return;
    const id = window.setInterval(() => setPart((p) => (p + 1) % PARTS.length), 1100);
    return () => window.clearInterval(id);
  }, [step]);

  return (
    <section className="relative flex flex-col overflow-hidden lg:h-[calc(100vh-3.5rem)] lg:min-h-[680px]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 lg:px-10">
        <div className="relative z-10 mt-10 max-w-[540px] animate-rise lg:mt-[11vh]">
          <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] lg:text-[64px]">
            Set a beam on fire.
            <br />
            See how it <span className="text-accent">fails.</span>
          </h1>
          <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-muted-foreground lg:mt-6 lg:text-lg">
            A model trained on 21,384 fire tests predicts how long your beam lasts.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/studio"
              className="whitespace-nowrap rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-accent-foreground shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0"
            >
              Open the studio
            </Link>
            <Link
              href="/explore"
              className="whitespace-nowrap rounded-full px-5 py-3 text-[15px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore the beams
            </Link>
          </div>
        </div>

      <div className="relative -mx-5 mt-2 h-[240px] lg:absolute lg:top-0 lg:right-0 lg:bottom-[170px] lg:mx-0 lg:mt-0 lg:h-auto lg:w-[64%]">
        <BeamViewer
          params={TYPICAL}
          simRef={sim}
          focus={step === 1 ? PARTS[part] : null}
          dark={resolvedTheme === "dark"}
          autoRotate={step !== 2}
          interactive={false}
          zoom={0.95}
          className="!absolute inset-0"
        />
      </div>

        <ol
          className="relative z-10 mb-10 mt-4 grid gap-7 lg:mt-auto lg:grid-cols-3 lg:gap-10"
          onMouseLeave={() => setPaused(false)}
        >
          {STEPS.map((s, i) => {
            const active = i === step;
            return (
              <li
                key={s.title}
                className="animate-rise"
                style={{ animationDelay: `${150 + i * 90}ms` }}
                onMouseEnter={() => {
                  setPaused(true);
                  setStep(i);
                }}
              >
                {/* progress rail: fills while this step drives the model */}
                <div className="relative h-0.5 overflow-hidden rounded-full bg-border">
                  {active && (
                    <div
                      key={`${step}-${paused}`}
                      className="absolute inset-y-0 left-0 bg-foreground"
                      style={{
                        width: paused ? "100%" : undefined,
                        animation: paused ? undefined : `fill ${step === 2 ? 9000 : STEP_MS}ms linear forwards`,
                      }}
                    />
                  )}
                </div>
                <Link href={s.href} className="group mt-5 block">
                  <div
                    className={cn(
                      "text-xl font-bold tracking-tight transition-colors",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </div>
                  <p className="mt-1.5 max-w-[340px] text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                  <span className="mt-3 inline-block text-sm font-semibold underline decoration-border decoration-2 underline-offset-4 transition-colors group-hover:decoration-accent">
                    {s.cta} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <style>{`@keyframes fill { from { width: 0% } to { width: 100% } }`}</style>
    </section>
  );
}
