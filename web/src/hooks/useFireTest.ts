"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SimState } from "@/components/beam/BeamViewer";
import { iso834, type FailureMode } from "@/lib/constants";

export type FirePhase = "idle" | "running" | "failed" | "held";

const heatAt = (t: number) => Math.min(1, (iso834(t) - 20) / 1000);

/**
 * Plays a fire test: the furnace follows the ISO 834 curve, and if the predicted
 * fire resistance is shorter than the target the beam fails at that moment.
 */
export function useFireTest() {
  const simRef = useRef<SimState>({ heat: 0, fail: 0, mode: null });
  const [phase, setPhase] = useState<FirePhase>("idle");
  const [clock, setClock] = useState(0);
  const raf = useRef(0);

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current);
    simRef.current = { heat: 0, fail: 0, mode: null };
    setPhase("idle");
    setClock(0);
  }, []);

  const start = useCallback(
    ({ frt, mode, target }: { frt: number; mode: string; target: number }) => {
      cancelAnimationFrame(raf.current);
      const fails = frt < target;
      const end = Math.max(1, fails ? frt : target);
      const visMode: FailureMode = fails
        ? mode === "Strength Failure"
          ? "Strength Failure"
          : "Deflection Failure"
        : "No Failure";
      const duration = Math.min(7, Math.max(3.2, end / 22)) * 1000;
      const t0 = performance.now();
      setPhase("running");

      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const t = end * p;
        setClock(t);
        // the beam creeps a little as it heats, then lets go at the end
        simRef.current = {
          heat: heatAt(t),
          fail: visMode === "Deflection Failure" ? p * 0.18 : 0,
          mode: visMode,
        };
        if (p < 1) {
          raf.current = requestAnimationFrame(tick);
        } else {
          simRef.current = { heat: heatAt(end), fail: 1, mode: visMode };
          setPhase(fails ? "failed" : "held");
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    []
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { simRef, phase, clock, start, reset };
}
