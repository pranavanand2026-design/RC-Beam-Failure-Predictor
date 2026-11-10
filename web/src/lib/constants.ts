export type FailureMode = "Deflection Failure" | "Strength Failure" | "No Failure";

export const MODES: FailureMode[] = [
  "Deflection Failure",
  "Strength Failure",
  "No Failure",
];

export const MODE_INFO: Record<
  FailureMode,
  { short: string; verb: string; past: string; color: string; tw: string; twBg: string }
> = {
  "Deflection Failure": {
    short: "Sags",
    verb: "Sags too far",
    past: "sagged too far",
    color: "var(--deflection)",
    tw: "text-deflection",
    twBg: "bg-deflection",
  },
  "Strength Failure": {
    short: "Breaks",
    verb: "Loses strength and breaks",
    past: "lost strength and broke",
    color: "var(--strength)",
    tw: "text-strength",
    twBg: "bg-strength",
  },
  "No Failure": {
    short: "Holds",
    verb: "Holds through the fire",
    past: "held through the full 5-hour test",
    color: "var(--nofail)",
    tw: "text-nofail",
    twBg: "bg-nofail",
  },
};

/** Which part of the 3D model a control belongs to, so it can be highlighted. */
export type BeamPart = "cover" | "insulation" | "steel" | "frp" | "load" | "shape" | null;

export interface FeatureControl {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  decimals: number;
  part: BeamPart;
  /** one short line, shown under the slider */
  hint?: string;
}

/** The six levers shown up front. Ranges match what the models were trained on. */
export const MAIN_CONTROLS: { group: string; items: FeatureControl[] }[] = [
  {
    group: "Fire protection",
    items: [
      { key: "Cc", label: "Concrete cover", unit: "mm", min: 10, max: 38, step: 1, decimals: 0, part: "cover", hint: "Concrete between the fire and the steel" },
      { key: "tins", label: "Insulation underneath", unit: "mm", min: 0, max: 38, step: 1, decimals: 0, part: "insulation" },
      { key: "hi", label: "Insulation up the sides", unit: "mm", min: 0, max: 114, step: 2, decimals: 0, part: "insulation" },
    ],
  },
  {
    group: "Reinforcement",
    items: [
      { key: "As", label: "Steel bars", unit: "mm²", min: 60, max: 860, step: 5, decimals: 0, part: "steel" },
      { key: "Af", label: "FRP strip", unit: "mm²", min: 0, max: 630, step: 5, decimals: 0, part: "frp", hint: "Carbon or glass fibre bonded to the underside" },
    ],
  },
  {
    group: "Load",
    items: [
      { key: "LR", label: "Load on the beam", unit: "% of capacity", min: 15, max: 74, step: 0.5, decimals: 0, part: "load" },
    ],
  },
];

export const MORE_CONTROLS: FeatureControl[] = [
  { key: "L", label: "Span", unit: "mm", min: 1220, max: 6200, step: 20, decimals: 0, part: "shape" },
  { key: "Ac", label: "Cross-section area", unit: "mm²", min: 12000, max: 157500, step: 500, decimals: 0, part: "shape" },
  { key: "Ld", label: "Applied load", unit: "kN", min: 4, max: 220, step: 0.5, decimals: 1, part: "load" },
  { key: "fc", label: "Concrete strength", unit: "MPa", min: 27, max: 40, step: 0.5, decimals: 1, part: null },
  { key: "fy", label: "Steel yield strength", unit: "MPa", min: 414, max: 460, step: 1, decimals: 0, part: "steel" },
  { key: "Es", label: "Steel stiffness", unit: "MPa", min: 200000, max: 210000, step: 1000, decimals: 0, part: "steel" },
  { key: "fu", label: "FRP strength", unit: "MPa", min: 0, max: 4840, step: 20, decimals: 0, part: "frp" },
  { key: "Efrp", label: "FRP stiffness", unit: "MPa", min: 0, max: 255530, step: 500, decimals: 0, part: "frp" },
  { key: "Tg", label: "Adhesive softening temp.", unit: "°C", min: 0, max: 88, step: 1, decimals: 0, part: "frp" },
  { key: "kins", label: "Insulation conductivity", unit: "W/mK", min: 0, max: 0.23, step: 0.002, decimals: 3, part: "insulation" },
  { key: "rinscins", label: "Insulation heat capacity", unit: "J/m³K", min: 0, max: 1031000, step: 1000, decimals: 0, part: "insulation" },
];

export const ALL_CONTROLS: FeatureControl[] = [
  ...MAIN_CONTROLS.flatMap((g) => g.items),
  ...MORE_CONTROLS,
];

export const CONTROL_BY_KEY: Record<string, FeatureControl> = Object.fromEntries(
  ALL_CONTROLS.map((c) => [c.key, c])
);

export const FIRE_RATINGS = [30, 60, 90, 120, 180];

/** ISO 834 standard fire curve: furnace temperature (°C) after t minutes. */
export function iso834(tMin: number) {
  return 20 + 345 * Math.log10(8 * Math.max(0, tMin) + 1);
}

export function formatValue(value: number, decimals: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
