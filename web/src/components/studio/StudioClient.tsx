"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BeamViewer } from "@/components/beam";
import { useBeamDetail, useFeatureMeta } from "@/hooks/useFeatureMeta";
import { useFireTest } from "@/hooks/useFireTest";
import { api } from "@/lib/api";
import type { BeamParams } from "@/lib/beamGeometry";
import {
  FIRE_RATINGS,
  MAIN_CONTROLS,
  MORE_CONTROLS,
  type BeamPart,
} from "@/lib/constants";
import type { PlaygroundResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ControlSlider } from "./ControlSlider";
import { FireClock, ResultBar } from "./ResultBar";
import { Suggestions } from "./Suggestions";
import { Tour, useTourSeen } from "./Tour";
import { BeamPicker } from "./BeamPicker";
import { LoadingRing } from "@/components/layout/LoadingRing";

export function StudioClient() {
  const router = useRouter();
  const search = useSearchParams();
  const beamId = search.get("beam");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const meta = useFeatureMeta();
  const beam = useBeamDetail(beamId);

  const [features, setFeatures] = useState<Record<string, number> | null>(null);
  const [baseline, setBaseline] = useState<Record<string, number> | null>(null);
  const [exposure, setExposure] = useState(90);
  const [margin, setMargin] = useState(10);
  const [focus, setFocus] = useState<BeamPart>(null);
  const [showMore, setShowMore] = useState(false);

  const [prediction, setPrediction] = useState<PlaygroundResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [predError, setPredError] = useState(false);

  const fire = useFireTest();
  const tour = useTourSeen();

  // starting point: a dataset beam from the URL, or the typical beam
  useEffect(() => {
    if (beamId) {
      if (beam.data) {
        setFeatures({ ...beam.data.features });
        setBaseline({ ...beam.data.features });
      }
    } else if (meta.data) {
      setFeatures({ ...meta.data.defaults });
      setBaseline({ ...meta.data.defaults });
    }
  }, [beamId, beam.data, meta.data]);

  // live prediction, debounced and cancellable
  useEffect(() => {
    if (!features) return;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setPending(true);
      try {
        const res = await api.playground(
          { features, baseline_features: baseline, exposure_minutes: exposure, margin_minutes: margin },
          ac.signal
        );
        setPrediction(res);
        setPredError(false);
      } catch {
        if (!ac.signal.aborted) setPredError(true);
      } finally {
        if (!ac.signal.aborted) setPending(false);
      }
    }, 110);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [features, baseline, exposure, margin]);

  // any design change invalidates a finished fire test
  const { reset } = fire;
  useEffect(() => {
    reset();
  }, [features, exposure, margin, reset]);

  const setValue = useCallback((key: string, value: number) => {
    setFeatures((f) => (f ? { ...f, [key]: value } : f));
  }, []);

  const applyChanges = useCallback((changes: Record<string, number>) => {
    setFeatures((f) => (f ? { ...f, ...changes } : f));
  }, []);

  const params: BeamParams | null = useMemo(
    () =>
      features
        ? {
            L: features.L,
            Ac: features.Ac,
            Cc: features.Cc,
            As: features.As,
            Af: features.Af,
            tins: features.tins,
            hi: features.hi,
            LR: features.LR,
          }
        : null,
    [features]
  );

  const runTest = () => {
    if (!prediction) return;
    fire.start({
      frt: prediction.frt_minutes,
      mode: prediction.predicted_mode,
      target: exposure + margin,
    });
  };

  const offline = meta.isError || (beamId && beam.isError) || (predError && !prediction);
  if (offline) {
    return (
      <Offline
        message={beamId && beam.isError ? `We couldn't find beam “${beamId}”.` : undefined}
        onRetry={() => {
          meta.refetch();
          beam.refetch();
          setPredError(false);
          setFeatures((f) => (f ? { ...f } : f));
        }}
      />
    );
  }


  return (
    <div className="flex flex-col lg:grid lg:h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* stage */}
      {/* on phones the stage sticks to the top so the beam stays in view while the controls scroll */}
      <section className="sticky top-14 z-20 h-[46vh] min-h-[320px] overflow-hidden bg-stage lg:relative lg:top-0 lg:h-auto lg:min-h-0">
        {params && (
          <BeamViewer
            params={params}
            simRef={fire.simRef}
            focus={focus}
            dark={dark}
            className="!absolute inset-0 cursor-grab active:cursor-grabbing"
          />
        )}
        {!params && (
          <div className="absolute inset-0 grid place-items-center px-6">
            <LoadingRing />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-start gap-3 p-3 lg:flex-row lg:justify-between lg:gap-6 lg:p-5">
          <BeamPicker
            beamId={beamId}
            onPick={(id) => router.replace(id ? `/studio?beam=${encodeURIComponent(id)}` : "/studio")}
          />
          <FireClock phase={fire.phase} clock={fire.clock} failedMode={fire.simRef.current.mode} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 lg:p-5">
          <div className="lg:max-w-[460px]">
            <ResultBar
              prediction={prediction}
              exposure={exposure}
              margin={margin}
              phase={fire.phase}
              clock={fire.clock}
              pending={pending}
              onRun={runTest}
            />
          </div>
        </div>

      </section>

      {/* controls */}
      <aside className="border-t bg-surface lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between px-5 pt-5 lg:px-6 lg:pt-6">
          <h2 className="text-lg font-bold tracking-tight">Design</h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={tour.start}
              className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Guide
            </button>
            <button
              type="button"
              onClick={() => baseline && setFeatures({ ...baseline })}
              className="rounded-full px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="px-5 pt-5 lg:px-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Fire exposure</span>
            <span className="text-xs text-muted-foreground">min</span>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1 rounded-full bg-surface-2 p-1">
            {FIRE_RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setExposure(r)}
                className={cn(
                  "tnum rounded-full py-1.5 text-sm font-semibold transition-colors",
                  exposure === r ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div data-tour="controls" className="px-5 pb-2 lg:px-6">
          {MAIN_CONTROLS.map((group) => (
            <div key={group.group} className="mt-6">
              <div className="text-[13px] font-semibold text-muted-foreground">{group.group}</div>
              {features &&
                group.items.map((c) => (
                  <ControlSlider
                    key={c.key}
                    control={c}
                    value={features[c.key] ?? c.min}
                    baseline={baseline?.[c.key]}
                    onChange={(v) => setValue(c.key, v)}
                    onFocusPart={setFocus}
                  />
                ))}
            </div>
          ))}
        </div>

        <div className="px-5 pb-4 lg:px-6">
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="flex w-full items-center justify-between py-3 text-sm font-medium"
            aria-expanded={showMore}
          >
            More properties
            <span className="text-muted-foreground">{showMore ? "Hide" : "Show"}</span>
          </button>
          {showMore && features && (
            <div className="pb-2">
              {MORE_CONTROLS.map((c) => (
                <ControlSlider
                  key={c.key}
                  control={c}
                  value={features[c.key] ?? c.min}
                  baseline={baseline?.[c.key]}
                  onChange={(v) => setValue(c.key, v)}
                  onFocusPart={setFocus}
                  compact
                />
              ))}
              <ControlSlider
                control={{
                  key: "margin",
                  label: "Safety margin",
                  unit: "min",
                  min: 0,
                  max: 60,
                  step: 5,
                  decimals: 0,
                  part: null,
                }}
                value={margin}
                onChange={setMargin}
                onFocusPart={setFocus}
                compact
              />
            </div>
          )}
        </div>

        {features && (
          <Suggestions
            features={features}
            exposure={exposure}
            margin={margin}
            holds={prediction ? prediction.gap_minutes >= 0 : null}
            onApply={applyChanges}
          />
        )}
      </aside>

      <Tour open={tour.open && !!prediction} onClose={tour.close} />
    </div>
  );
}

function Offline({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="grid flex-1 place-items-center px-6 py-24">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold tracking-tight">{message ?? "Can't reach the prediction service"}</h1>
        <p className="mt-2 text-muted-foreground">
          {message
            ? "It may have been mistyped. Pick another from the full list."
            : "The model runs on a separate server that isn't answering right now."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background"
          >
            Try again
          </button>
          <Link href="/explore" className="rounded-full border px-5 py-2 text-sm font-semibold">
            Browse beams
          </Link>
        </div>
      </div>
    </div>
  );
}
