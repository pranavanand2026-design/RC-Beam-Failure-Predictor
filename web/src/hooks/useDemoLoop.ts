"use client";

import { useEffect, useRef } from "react";
import type { SimState } from "@/components/beam/BeamViewer";
import type { FailureMode } from "@/lib/constants";

/**
 * Loops a short, wordless fire test for showcase viewers:
 * calm → fire builds → the beam fails (or holds) → it cools and resets.
 * When inactive the beam sits cold; becoming active restarts from the top.
 */
export function useDemoLoop(mode: FailureMode, offset = 0, active = true) {
  const simRef = useRef<SimState>({ heat: 0, fail: 0, mode });

  useEffect(() => {
    if (!active) {
      simRef.current = { heat: 0, fail: 0, mode };
      return;
    }
    let raf = 0;
    const period = 9;
    const t0 = performance.now() - offset * 1000;
    const tick = (now: number) => {
      const t = ((now - t0) / 1000) % period;
      let heat = 0;
      let fail = 0;
      if (t < 1.2) heat = 0;
      else if (t < 4.2) heat = (t - 1.2) / 3;
      else if (t < 7.2) {
        heat = 1;
        fail = 1;
      } else heat = 0;
      simRef.current = { heat, fail, mode };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, offset, active]);

  return simRef;
}
