"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { IndexedBeam } from "@/lib/types";

// The API is on free hosting that sleeps when idle; keep retrying for about a minute while it wakes.
const WAKE_RETRY = { retry: 12, retryDelay: 5000 } as const;

export function useFeatureMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: api.getMeta,
    staleTime: Infinity,
    ...WAKE_RETRY,
  });
}

export const beamIndexQuery = {
  queryKey: ["beam-index"],
  queryFn: async (): Promise<IndexedBeam[]> => {
    const res = await api.beamIndex();
    return res.rows.map(
      (row) => Object.fromEntries(res.columns.map((c, i) => [c, row[i]])) as unknown as IndexedBeam
    );
  },
  staleTime: Infinity,
  ...WAKE_RETRY,
};

export function useBeamIndex() {
  return useQuery(beamIndexQuery);
}

export function useBeamDetail(beamId: string | null) {
  return useQuery({
    queryKey: ["beam", beamId],
    queryFn: () => api.getBeam(beamId!),
    enabled: !!beamId,
    staleTime: Infinity,
  });
}
