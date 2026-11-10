import { layoutBeam } from "@/lib/beamGeometry";
import type { IndexedBeam } from "@/lib/types";

/**
 * A small cross-section of the beam: concrete, steel cage at its cover depth,
 * FRP strip and insulation. Built from the same layout as the 3D model.
 */
export function BeamSection({ beam, size = 40 }: { beam: IndexedBeam; size?: number }) {
  const L = layoutBeam(beam);
  const side = L.insulation?.side ?? 0;
  const W = L.b + 2 * side;
  const top = L.h / 2;
  const H = top - L.yBottom;
  const pad = 2;
  const k = (size - pad * 2) / Math.max(W, H);
  const cx = size / 2;
  const oy = (size - H * k) / 2;
  // beam y (up) → svg y (down)
  const Y = (y: number) => oy + (top - y) * k;
  const X = (z: number) => cx + z * k;

  const ins = L.insulation;
  const frpT = L.frp ? L.frp.t : 0;
  const s = L.stirrup;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      {ins && ins.bottom > 0.5 && (
        <rect
          x={X(-L.b / 2 - side)}
          y={Y(-L.h / 2 - frpT)}
          width={W * k}
          height={ins.bottom * k}
          fill="#e7d6ad"
        />
      )}
      {ins && side > 0 && ins.sideHeight > 0.5 &&
        [-1, 1].map((sgn) => (
          <rect
            key={sgn}
            x={sgn < 0 ? X(-L.b / 2 - side) : X(L.b / 2)}
            y={Y(-L.h / 2 + ins.sideHeight)}
            width={side * k}
            height={(ins.sideHeight + frpT + ins.bottom) * k}
            fill="#e7d6ad"
          />
        ))}
      <rect
        x={X(-L.b / 2)}
        y={Y(top)}
        width={L.b * k}
        height={L.h * k}
        fill="var(--surface-2)"
        stroke="var(--muted-foreground)"
        strokeOpacity={0.5}
        strokeWidth={0.75}
      />
      {L.frp && (
        <rect x={X(-L.frp.w / 2)} y={Y(-L.h / 2)} width={L.frp.w * k} height={Math.max(1.2, frpT * k)} fill="var(--foreground)" />
      )}
      <rect
        x={X(s.z0)}
        y={Y(s.y1)}
        width={(s.z1 - s.z0) * k}
        height={(s.y1 - s.y0) * k}
        rx={1.5}
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity={0.55}
        strokeWidth={0.75}
      />
      {[...L.bottomBars, ...L.topBars].map((b, i) => (
        <circle key={i} cx={X(b.z)} cy={Y(b.y)} r={Math.max(1, (b.d / 2) * k)} fill="var(--foreground)" />
      ))}
    </svg>
  );
}
