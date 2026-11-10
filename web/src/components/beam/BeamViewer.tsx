"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { layoutBeam, type BeamLayout, type BeamParams } from "@/lib/beamGeometry";
import type { BeamPart, FailureMode } from "@/lib/constants";

/** Written by whoever drives the fire test; read every frame by the scene. */
export interface SimState {
  /** 0..1, how hot the furnace is */
  heat: number;
  /** 0..1, how far into its failure the beam is */
  fail: number;
  mode: FailureMode | null;
}

export interface BeamViewerProps {
  params: BeamParams;
  simRef?: MutableRefObject<SimState>;
  focus?: BeamPart;
  dark?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  /** camera distance multiplier, >1 pulls back */
  zoom?: number;
  className?: string;
}

const MM = 1 / 300; // scene units per drawn millimetre

const PALETTE = {
  light: {
    concrete: "#cbc7bf",
    steel: "#878da6",
    frp: "#26282d",
    insulation: "#eadfc7",
    line: "#2f2d29",
    lineOpacity: 0.32,
    ghostOpacity: 0.16,
    arrow: "#7d7970",
    support: "#a29e96",
    shadow: 0.13,
  },
  dark: {
    concrete: "#8e8a83",
    steel: "#a2a9c4",
    frp: "#121316",
    insulation: "#cfc3aa",
    line: "#f2f0eb",
    lineOpacity: 0.22,
    ghostOpacity: 0.14,
    arrow: "#d9d5cc",
    support: "#5a5751",
    shadow: 0.38,
  },
};

const ACCENT = new THREE.Color("#ff6a2b");

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Box outline with the long edges split so they can bend with the beam. */
function boxEdges(
  x0: number, x1: number, y0: number, y1: number, z0: number, z1: number,
  seg: number, out: number[], ends = true
) {
  const corners: [number, number][] = [[y0, z0], [y1, z0], [y1, z1], [y0, z1]];
  for (const [y, z] of corners) {
    for (let i = 0; i < seg; i++) {
      const a = x0 + ((x1 - x0) * i) / seg;
      const b = x0 + ((x1 - x0) * (i + 1)) / seg;
      out.push(a, y, z, b, y, z);
    }
  }
  const xs = ends ? [x0, x1] : [x0];
  for (const x of xs) {
    for (let i = 0; i < 4; i++) {
      const [ya, za] = corners[i];
      const [yb, zb] = corners[(i + 1) % 4];
      out.push(x, ya, za, x, yb, zb);
    }
  }
}

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, seg = 40) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0, seg, 1, 1);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

function bar(x0: number, x1: number, y: number, z: number, d: number) {
  const g = new THREE.CylinderGeometry(d / 2, d / 2, x1 - x0, 10, 48);
  g.rotateZ(Math.PI / 2);
  g.translate((x0 + x1) / 2, y, z);
  return g;
}

function stirrup(x: number, y0: number, y1: number, z0: number, z1: number, d: number) {
  const r = Math.min(d * 2, (y1 - y0) / 4, (z1 - z0) / 4);
  const pts: THREE.Vector3[] = [];
  const corner = (cy: number, cz: number, start: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = start + (i / 4) * (Math.PI / 2);
      pts.push(new THREE.Vector3(x, cy + Math.sin(a) * r, cz + Math.cos(a) * r));
    }
  };
  corner(y1 - r, z1 - r, 0);
  corner(y1 - r, z0 + r, Math.PI / 2);
  corner(y0 + r, z0 + r, Math.PI);
  corner(y0 + r, z1 - r, Math.PI * 1.5);
  const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
  return new THREE.TubeGeometry(curve, 40, d / 2, 6, true);
}

function lines(positions: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return g;
}

function buildGeometry(L: BeamLayout) {
  const { b, h, x0, x1, concreteEnd, insulationEnd } = L;

  const concrete = box(x0, concreteEnd, -h / 2, h / 2, -b / 2, b / 2, 48);
  const concreteEdge: number[] = [];
  boxEdges(x0, concreteEnd, -h / 2, h / 2, -b / 2, b / 2, 48, concreteEdge);
  const ghostEdge: number[] = [];
  boxEdges(concreteEnd, x1, -h / 2, h / 2, -b / 2, b / 2, 40, ghostEdge);

  const steelParts: THREE.BufferGeometry[] = [];
  for (const br of [...L.bottomBars, ...L.topBars]) {
    steelParts.push(bar(x0 + 12, x1 + br.d * 2.5, br.y, br.z, br.d));
  }
  const s = L.stirrup;
  for (const x of s.xs) steelParts.push(stirrup(x, s.y0, s.y1, s.z0, s.z1, s.d));
  const steel = mergeGeometries(steelParts)!;
  steelParts.forEach((g) => g.dispose());

  let frp: THREE.BufferGeometry | null = null;
  if (L.frp) {
    frp = box(x0 + 18, concreteEnd, -h / 2 - L.frp.t, -h / 2, -L.frp.w / 2, L.frp.w / 2);
  }

  let insulation: THREE.BufferGeometry | null = null;
  const insulationEdge: number[] = [];
  if (L.insulation) {
    const ins = L.insulation;
    const top = -h / 2 - (L.frp ? L.frp.t : 0);
    const parts: THREE.BufferGeometry[] = [];
    const half = b / 2 + ins.side;
    if (ins.bottom > 0.5) {
      parts.push(box(x0, insulationEnd, top - ins.bottom, top, -half, half));
      boxEdges(x0, insulationEnd, top - ins.bottom, top, -half, half, 40, insulationEdge);
    }
    if (ins.side > 0 && ins.sideHeight > 0.5) {
      const y0 = L.yBottom;
      const y1 = -h / 2 + ins.sideHeight;
      for (const sign of [-1, 1]) {
        const za = sign * (b / 2);
        const zb = sign * half;
        parts.push(box(x0, insulationEnd, y0, y1, Math.min(za, zb), Math.max(za, zb)));
        boxEdges(x0, insulationEnd, y0, y1, Math.min(za, zb), Math.max(za, zb), 40, insulationEdge);
      }
    }
    if (parts.length) {
      insulation = mergeGeometries(parts)!;
      parts.forEach((g) => g.dispose());
    }
  }

  // distributed load: a row of arrows whose length follows the load ratio
  const arrowParts: THREE.BufferGeometry[] = [];
  // only over the solid concrete, so they read as loading the beam itself
  const n = 5;
  const gap = h * 0.08;
  const la = h * (0.12 + L.load * 0.45);
  const head = h * 0.08;
  const xa0 = x0 + L.len * 0.07;
  const xa1 = concreteEnd - L.len * 0.06;
  for (let i = 0; i < n; i++) {
    const x = xa0 + ((xa1 - xa0) * i) / (n - 1);
    const shaft = new THREE.CylinderGeometry(h * 0.007, h * 0.007, la - head, 6, 1);
    shaft.translate(x, h / 2 + gap + head + (la - head) / 2, 0);
    const cone = new THREE.ConeGeometry(h * 0.026, head, 12, 1);
    cone.rotateX(Math.PI);
    cone.translate(x, h / 2 + gap + head / 2, 0);
    arrowParts.push(shaft, cone);
  }
  arrowParts.push(box(xa0, xa1, h / 2 + gap + la, h / 2 + gap + la + h * 0.014, -h * 0.007, h * 0.007, 30));
  const arrows = mergeGeometries(arrowParts)!;
  arrowParts.forEach((g) => g.dispose());

  return {
    concrete,
    concreteEdge: lines(concreteEdge),
    ghostEdge: lines(ghostEdge),
    steel,
    frp,
    insulation,
    insulationEdge: insulationEdge.length ? lines(insulationEdge) : null,
    arrows,
  };
}

/* ------------------------------------------------------------------ */
/* Materials: one shader patch gives every part bending, heat and focus */
/* ------------------------------------------------------------------ */

type U = { value: number };
interface Shared {
  uSag: U;
  uKink: U;
  uHalfL: U;
  uHeat: U;
  uYBot: U;
  uH: U;
  uTime: U;
  uFocusColor: { value: THREE.Color };
}
interface Own {
  uFocus: U;
  uProt: U;
}

const VERT_HEAD = /* glsl */ `
uniform float uSag;
uniform float uKink;
uniform float uHalfL;
varying vec3 vBeamPos;`;

const VERT_BEND = /* glsl */ `
vBeamPos = transformed;
{
  float xn = clamp(transformed.x / uHalfL, -1.0, 1.0);
  transformed.y -= uSag * mix(1.0 - xn * xn, 1.0 - abs(xn), uKink);
}`;

const FRAG_HEAD = /* glsl */ `
uniform float uHeat;
uniform float uYBot;
uniform float uH;
uniform float uProt;
uniform float uFocus;
uniform float uTime;
uniform float uKink;
uniform float uHalfL;
uniform vec3 uFocusColor;
varying vec3 vBeamPos;`;

const FRAG_GLOW = /* glsl */ `
{
  float hb = clamp(1.0 - (vBeamPos.y - uYBot) / uH, 0.0, 1.0);
  vec3 glow = mix(vec3(0.8, 0.1, 0.02), vec3(1.0, 0.55, 0.12), hb);
  float flick = 0.88 + 0.12 * sin(uTime * 7.0 + vBeamPos.x * 0.03);
  totalEmissiveRadiance += glow * uHeat * uProt * pow(hb, 2.4) * flick * 1.4;
  float crack = uKink * exp(-pow(vBeamPos.x / (0.05 * uHalfL), 2.0));
  totalEmissiveRadiance += vec3(1.0, 0.16, 0.06) * crack * 1.8;
  totalEmissiveRadiance += uFocusColor * uFocus * (0.32 + 0.14 * sin(uTime * 4.0));
}`;

function patch(mat: THREE.Material, shared: Shared, own: Own | null, lit: boolean) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, own ?? {});
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERT_HEAD}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERT_BEND}`);
    if (lit) {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAG_HEAD}`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${FRAG_GLOW}`);
    }
  };
  mat.customProgramCacheKey = () => (lit ? "beam-lit" : "beam-line");
}

const FLAME_FRAG = /* glsl */ `
uniform float uTime;
uniform float uHeat;
uniform float uSeed;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  float n = fbm(vec2(vUv.x * 9.0 + uSeed, vUv.y * 2.6 - uTime * 1.7));
  float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
  float f = smoothstep(0.2, 0.75, (1.0 - vUv.y) * 1.1 + (n - 0.5) * 1.1);
  f *= edge * uHeat * smoothstep(0.0, 0.18, vUv.y);
  vec3 col = mix(vec3(0.95, 0.2, 0.02), vec3(1.0, 0.82, 0.38), smoothstep(0.45, 1.0, f));
  gl_FragColor = vec4(col, f * 0.92);
}`;

const FLAME_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const STATIC_SIM: MutableRefObject<SimState> = { current: { heat: 0, fail: 0, mode: null } };

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));

function Beam({
  params,
  simRef,
  focus,
  dark,
}: {
  params: BeamParams;
  simRef: MutableRefObject<SimState>;
  focus: BeamPart;
  dark: boolean;
}) {
  const layout = useMemo(
    () => layoutBeam(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.L, params.Ac, params.Cc, params.As, params.Af, params.tins, params.hi, params.LR]
  );
  const geo = useMemo(() => buildGeometry(layout), [layout]);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g?.dispose());
    },
    [geo]
  );

  const shared = useMemo<Shared>(
    () => ({
      uSag: { value: 0 },
      uKink: { value: 0 },
      uHalfL: { value: 1 },
      uHeat: { value: 0 },
      uYBot: { value: 0 },
      uH: { value: 1 },
      uTime: { value: 0 },
      uFocusColor: { value: ACCENT.clone() },
    }),
    []
  );
  const own = useMemo(() => {
    const mk = (): Own => ({ uFocus: { value: 0 }, uProt: { value: 1 } });
    return { concrete: mk(), steel: mk(), frp: mk(), insulation: mk(), arrows: mk() };
  }, []);

  const pal = dark ? PALETTE.dark : PALETTE.light;
  const mats = useMemo(() => {
    const std = (color: string, rough: number, metal: number, o: Own) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
      patch(m, shared, o, true);
      return m;
    };
    const line = (opacity: number) => {
      const m = new THREE.LineBasicMaterial({ color: pal.line, transparent: true, opacity });
      patch(m, shared, null, false);
      return m;
    };
    return {
      concrete: std(pal.concrete, 0.92, 0, own.concrete),
      steel: std(pal.steel, 0.38, 0.55, own.steel),
      frp: std(pal.frp, 0.45, 0.3, own.frp),
      insulation: std(pal.insulation, 1, 0, own.insulation),
      arrows: std(pal.arrow, 0.6, 0.1, own.arrows),
      edge: line(pal.lineOpacity),
      ghost: line(pal.ghostOpacity),
    };
  }, [pal, shared, own]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const flameMat = useMemo(
    () =>
      [0.3, 7.1, 13.7].map(
        (seed) =>
          new THREE.ShaderMaterial({
            uniforms: { uTime: shared.uTime, uHeat: shared.uHeat, uSeed: { value: seed } },
            vertexShader: FLAME_VERT,
            fragmentShader: FLAME_FRAG,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
      ),
    [shared]
  );

  const fireLight = useRef<THREE.PointLight>(null);

  // insulation shields the concrete from the glow
  const shield = Math.min(1, ((params.tins || 0) + (params.hi || 0) * 0.3) / 40);

  useFrame((state, dt) => {
    const sim = simRef.current;
    const t = state.clock.elapsedTime;
    shared.uTime.value = t;
    shared.uHalfL.value = layout.len / 2;
    shared.uYBot.value = layout.yBottom;
    shared.uH.value = layout.h / 2 - layout.yBottom;

    shared.uHeat.value = damp(shared.uHeat.value, sim.heat, 3, dt);
    const h = layout.h;
    let sagTarget = 0;
    let kinkTarget = 0;
    if (sim.mode === "Deflection Failure") sagTarget = sim.fail * h * 0.34;
    else if (sim.mode === "Strength Failure") {
      sagTarget = sim.fail * h * 0.4;
      kinkTarget = sim.fail;
    } else if (sim.mode === "No Failure") sagTarget = sim.fail * h * 0.025;
    const k = sim.mode === "Strength Failure" ? 9 : 2.2;
    shared.uSag.value = damp(shared.uSag.value, sagTarget, k, dt);
    shared.uKink.value = damp(shared.uKink.value, kinkTarget, k, dt);

    const parts: [keyof typeof own, BeamPart[], number][] = [
      ["concrete", ["cover", "shape"], 1 - shield * 0.8],
      ["steel", ["steel"], 0.45],
      ["frp", ["frp"], 1 - shield * 0.6],
      ["insulation", ["insulation"], 1],
      ["arrows", ["load"], 0],
    ];
    for (const [name, tags, prot] of parts) {
      own[name].uFocus.value = damp(own[name].uFocus.value, tags.includes(focus) ? 1 : 0, 6, dt);
      own[name].uProt.value = prot;
    }

    if (fireLight.current) {
      fireLight.current.intensity =
        shared.uHeat.value * (5 + 1.5 * Math.sin(t * 9) + Math.sin(t * 23)) ;
    }
  });

  const groundY = layout.yBottom - layout.h * 0.32;
  const supportR = layout.h * 0.2;
  const supportX = layout.len / 2 - layout.len * 0.05;
  const flameW = layout.len * 0.82;
  const flameH = layout.yBottom - groundY + layout.h * 0.75;

  return (
    <group scale={MM}>
      <mesh geometry={geo.concrete} material={mats.concrete} castShadow receiveShadow />
      <lineSegments geometry={geo.concreteEdge} material={mats.edge} />
      <lineSegments geometry={geo.ghostEdge} material={mats.ghost} />
      <mesh geometry={geo.steel} material={mats.steel} castShadow />
      {geo.frp && <mesh geometry={geo.frp} material={mats.frp} castShadow />}
      {geo.insulation && <mesh geometry={geo.insulation} material={mats.insulation} castShadow />}
      {geo.insulationEdge && <lineSegments geometry={geo.insulationEdge} material={mats.edge} />}
      <mesh geometry={geo.arrows} material={mats.arrows} castShadow />

      {[-supportX, supportX].map((x) => (
        <mesh
          key={x}
          position={[x, layout.yBottom - supportR, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[supportR, supportR, layout.b * 1.5, 3]} />
          <meshStandardMaterial color={pal.support} roughness={0.9} />
        </mesh>
      ))}

      {flameMat.map((m, i) => (
        <mesh
          key={i}
          material={m}
          position={[0, groundY + flameH / 2, (i - 1) * layout.b * 0.32]}
          renderOrder={2}
        >
          <planeGeometry args={[flameW, flameH]} />
        </mesh>
      ))}
      <pointLight
        ref={fireLight}
        position={[0, layout.yBottom - layout.h * 0.15, layout.b]}
        color="#ff6a1f"
        intensity={0}
        distance={layout.len * 1.6}
        decay={0.6}
      />

      <mesh position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.len * 4, layout.len * 3]} />
        <shadowMaterial transparent opacity={pal.shadow} />
      </mesh>
    </group>
  );
}

function Rig({
  params,
  autoRotate,
  interactive,
  zoom,
}: {
  params: BeamParams;
  autoRotate: boolean;
  interactive: boolean;
  zoom: number;
}) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const layout = useMemo(() => layoutBeam(params), [params]);
  const want = (layout.len * MM * 1.3 + layout.h * MM * 1.4 + 1.3) * zoom;
  // aim a little below the beam so it sits above the result card
  const centreY = (layout.h / 2 + layout.yBottom) * 0.5 * MM - want * 0.07;

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.rotateSpeed = 0.55;
    c.minPolarAngle = 0.25;
    c.maxPolarAngle = Math.PI * 0.6;
    controls.current = c;
    return () => c.dispose();
  }, [camera, gl]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.enabled = interactive;
    c.enableZoom = interactive;
    c.autoRotate = autoRotate;
    c.autoRotateSpeed = 0.7;
  }, [interactive, autoRotate]);

  // start from a three-quarter view
  useEffect(() => {
    camera.position.set(want * 0.5, want * 0.3, want * 0.82);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    c.target.y = damp(c.target.y, centreY, 4, dt);
    // ease the camera in or out when the beam changes size, keeping the user's angle
    const dir = camera.position.clone().sub(c.target);
    const dist = dir.length();
    const next = damp(dist, want, 3, dt);
    if (Math.abs(next - dist) > 1e-4) camera.position.copy(c.target).add(dir.multiplyScalar(next / dist));
    c.minDistance = want * 0.55;
    c.maxDistance = want * 1.6;
    c.update();
  });

  return null;
}

export default function BeamViewer({
  params,
  simRef = STATIC_SIM,
  focus = null,
  dark = false,
  autoRotate = false,
  interactive = true,
  zoom = 1,
  className,
}: BeamViewerProps) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.05, far: 100, position: [3, 1.5, 6] }}
      gl={{ antialias: true, alpha: true }}
    >
      <hemisphereLight args={[dark ? "#c9d1ff" : "#ffffff", dark ? "#2a2520" : "#b9b2a6", dark ? 1.1 : 1.35]} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={dark ? 1.6 : 2.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 2, -4]} intensity={0.5} />
      <Beam params={params} simRef={simRef} focus={focus} dark={dark} />
      <Rig params={params} autoRotate={autoRotate} interactive={interactive} zoom={zoom} />
    </Canvas>
  );
}
