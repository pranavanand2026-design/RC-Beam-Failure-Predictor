"use client";

import dynamic from "next/dynamic";

/** The 3D viewer only runs in the browser; this keeps three.js out of the server build. */
export const BeamViewer = dynamic(() => import("./BeamViewer"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export type { SimState } from "./BeamViewer";
