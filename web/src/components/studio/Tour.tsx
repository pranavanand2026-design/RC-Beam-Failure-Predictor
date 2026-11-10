"use client";

import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";

const STEPS = [
  {
    target: "controls",
    title: "Shape the beam",
    body: "Drag any slider. The part you're changing lights up on the model.",
    place: "left" as const,
  },
  {
    target: "verdict",
    title: "Read the verdict",
    body: "See how long it lasts in a fire, and how it gives way when it does.",
    place: "top" as const,
  },
  {
    target: "run",
    title: "Light the fire",
    body: "Play the fire test and watch the beam heat up minute by minute.",
    place: "top" as const,
  },
];

const KEY = "rcbeam-tour-done";

const readSeen = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // storage blocked: skip the tour rather than show it every visit
  }
};

export function useTourSeen() {
  const seen = useSyncExternalStore(
    () => () => {},
    readSeen,
    () => true
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? !seen;
  const close = useCallback(() => {
    setOverride(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);
  return { open, start: () => setOverride(true), close };
}

export function Tour({ open, onClose: close }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const onClose = useCallback(() => {
    setStep(0);
    close();
  }, [close]);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    const id = window.setInterval(measure, 400);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearInterval(id);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !rect) return null;
  const s = STEPS[step];
  const pad = 8;
  const last = step === STEPS.length - 1;

  const card: React.CSSProperties =
    s.place === "left"
      ? { right: window.innerWidth - rect.left + 20, top: rect.top + 40 }
      : { left: Math.max(16, rect.left), bottom: window.innerHeight - rect.top + 20 };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Quick tour">
      <div
        className="pointer-events-none fixed rounded-xl transition-all duration-300"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: "0 0 0 9999px rgba(12,11,9,0.55)",
        }}
      />
      <div className="fixed w-80 animate-rise rounded-xl bg-surface p-5 shadow-2xl" style={card} key={step}>
        <div className="text-xs font-semibold text-accent">
          Step {step + 1} of {STEPS.length}
        </div>
        <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
            Skip
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : setStep(step + 1))}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background"
          >
            {last ? "Start designing" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
