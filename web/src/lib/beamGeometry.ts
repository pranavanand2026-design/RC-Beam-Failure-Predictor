/**
 * Turns the model's beam features into a drawable layout (all lengths in mm).
 *
 * The span is compressed so long beams still fit on screen, but the cross-section,
 * cover, bar sizes, FRP strip and insulation keep their real proportions.
 */
export interface BeamParams {
  L: number;
  Ac: number;
  Cc: number;
  As: number;
  Af: number;
  tins: number;
  hi: number;
  LR: number;
}

export interface Bar {
  y: number;
  z: number;
  d: number;
}

export interface BeamLayout {
  b: number;
  h: number;
  /** drawn length */
  len: number;
  x0: number;
  x1: number;
  concreteEnd: number;
  insulationEnd: number;
  bottomBars: Bar[];
  topBars: Bar[];
  stirrup: { y0: number; y1: number; z0: number; z1: number; d: number; xs: number[] };
  frp: { w: number; t: number } | null;
  insulation: { bottom: number; side: number; sideHeight: number } | null;
  /** lowest point of the beam assembly (underside of insulation / FRP / concrete) */
  yBottom: number;
  load: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function layoutBeam(p: BeamParams): BeamLayout {
  const Ac = clamp(p.Ac || 90000, 8000, 200000);
  const b = Math.sqrt(Ac / 1.6);
  const h = 1.6 * b;
  const len = clamp(900 + ((p.L || 3000) - 1220) * 0.3, 900, 2500);
  const x0 = -len / 2;
  const x1 = len / 2;

  const As = Math.max(p.As || 0, 30);
  const nb = As < 160 ? 2 : As < 500 ? 3 : 4;
  const db = clamp(Math.sqrt((4 * As) / (nb * Math.PI)), 8, 28);
  const ds = clamp(db * 0.55, 6, 10);
  const dt = clamp(db * 0.7, 8, 16);

  // stirrup centreline, inset by cover, never collapsing to nothing
  const cover = clamp(p.Cc || 25, 5, 60);
  const halfW = Math.max(b / 2 - cover - ds / 2, db * 1.2);
  const halfH = Math.max(h / 2 - cover - ds / 2, db * 1.6);
  const sy0 = -halfH;
  const sy1 = halfH;

  const inner = halfW - ds / 2 - db / 2;
  const bottomBars: Bar[] = Array.from({ length: nb }, (_, i) => ({
    y: sy0 + ds / 2 + db / 2,
    z: -inner + (2 * inner * i) / (nb - 1),
    d: db,
  }));
  const innerTop = halfW - ds / 2 - dt / 2;
  const topBars: Bar[] = [-innerTop, innerTop].map((z) => ({
    y: sy1 - ds / 2 - dt / 2,
    z,
    d: dt,
  }));

  const spacing = clamp(h * 0.6, 70, 240);
  const xs: number[] = [];
  for (let x = x0 + spacing * 0.5; x < x1 - spacing * 0.3; x += spacing) xs.push(x);

  const Af = Math.max(p.Af || 0, 0);
  const frp = Af > 1 ? { w: clamp(Af / 1.4, b * 0.3, b * 0.92), t: 4 } : null;

  const tins = Math.max(p.tins || 0, 0);
  const hi = Math.max(p.hi || 0, 0);
  const insulation =
    tins > 0.5 || hi > 0.5
      ? {
          bottom: tins,
          side: hi > 0.5 ? Math.max(tins, 12) : 0,
          sideHeight: Math.min(hi, h),
        }
      : null;

  const yBottom = -h / 2 - (frp ? frp.t : 0) - (insulation ? insulation.bottom : 0);

  return {
    b,
    h,
    len,
    x0,
    x1,
    concreteEnd: x0 + len * 0.54,
    insulationEnd: x0 + len * 0.36,
    bottomBars,
    topBars,
    stirrup: { y0: sy0, y1: sy1, z0: -halfW, z1: halfW, d: ds, xs },
    frp,
    insulation,
    yBottom,
    load: clamp(p.LR || 50, 0, 100) / 100,
  };
}
