/**
 * A side-view athlete drawn from joint angles, animated by keyframes. Pure functions only, so the
 * same poses render in the app (SVG) and in tests.
 *
 * Angles are in degrees. Limbs: 0 = pointing straight down, +90 = pointing forward (the figure
 * faces right), 180 = straight up. Torso: 0 = upright, + leans forward, 90 = lying face down
 * (head forward), -90 = lying on the back (head backward).
 * "n" = near side (drawn bright, in front), "f" = far side (drawn dim, behind).
 */
export type Pose = {
  torso: number;
  head?: number; // head tilt relative to the torso
  nThigh: number; nShin: number; nFoot?: number;
  fThigh: number; fShin: number; fFoot?: number;
  nArm: number; nFore: number;
  fArm: number; fFore: number;
  lift?: number; // airborne height (jumps, running)
  x?: number; // horizontal shift
};
export type Anim = { frames: Pose[]; ms: number; ease?: "smooth" | "linear"; hold?: number[] };

const L = { torso: 36, neck: 5, head: 7.5, thigh: 27, shin: 27, foot: 9, arm: 19, fore: 18 };
type P = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
const limb = (o: P, a: number, len: number): P => ({ x: o.x + Math.sin(rad(a)) * len, y: o.y + Math.cos(rad(a)) * len });

export type Shape = { hip: P; neck: P; head: P; shoulder: P;
  n: { knee: P; ankle: P; toe: P; elbow: P; hand: P };
  f: { knee: P; ankle: P; toe: P; elbow: P; hand: P } };

/** Joint positions for a pose, feet (or whatever is lowest) resting on the ground line. */
export function shape(p: Pose, ground = 100, cx = 60): Shape {
  const hip0 = { x: 0, y: 0 };
  const top = { x: Math.sin(rad(p.torso)) * L.torso, y: -Math.cos(rad(p.torso)) * L.torso };
  const shoulder = { x: top.x - Math.sin(rad(p.torso)) * 3, y: top.y + Math.cos(rad(p.torso)) * 3 };
  const ht = p.torso + (p.head ?? 0);
  const neck = { x: top.x + Math.sin(rad(ht)) * L.neck, y: top.y - Math.cos(rad(ht)) * L.neck };
  const head = { x: neck.x + Math.sin(rad(ht)) * L.head, y: neck.y - Math.cos(rad(ht)) * L.head };
  const side = (thigh: number, shinA: number, foot: number | undefined, arm: number, fore: number) => {
    const knee = limb(hip0, thigh, L.thigh);
    const ankle = limb(knee, shinA, L.shin);
    const toe = limb(ankle, foot ?? shinA + 90, L.foot); // default: foot at right angle, pointing forward
    const elbow = limb(shoulder, arm, L.arm);
    const hand = limb(elbow, fore, L.fore);
    return { knee, ankle, toe, elbow, hand };
  };
  const n = side(p.nThigh, p.nShin, p.nFoot, p.nArm, p.nFore);
  const f = side(p.fThigh, p.fShin, p.fFoot, p.fArm, p.fFore);
  const pts = [hip0, shoulder, { x: head.x, y: head.y + L.head }, n.knee, n.ankle, n.toe, n.elbow, n.hand, f.knee, f.ankle, f.toe, f.elbow, f.hand];
  const low = Math.max(...pts.map((q) => q.y));
  const dy = ground - low - (p.lift ?? 0);
  const dx = cx + (p.x ?? 0);
  const mv = (q: P): P => ({ x: q.x + dx, y: q.y + dy });
  const mvs = (s: typeof n) => ({ knee: mv(s.knee), ankle: mv(s.ankle), toe: mv(s.toe), elbow: mv(s.elbow), hand: mv(s.hand) });
  return { hip: mv(hip0), neck: mv(neck), head: mv(head), shoulder: mv(shoulder), n: mvs(n), f: mvs(f) };
}

const KEYS: (keyof Pose)[] = ["torso", "head", "nThigh", "nShin", "nFoot", "fThigh", "fShin", "fFoot", "nArm", "nFore", "fArm", "fFore", "lift", "x"];
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Fills the optional fields, so frames interpolate cleanly (feet default to a right angle with the shin). */
const full = (p: Pose): Required<Pose> => ({ ...p, head: p.head ?? 0, lift: p.lift ?? 0, x: p.x ?? 0, nFoot: p.nFoot ?? p.nShin + 90, fFoot: p.fFoot ?? p.fShin + 90 });

/** The pose at time t (ms), looping through the keyframes. */
export function poseAt(a: Anim, t: number): Pose {
  const n = a.frames.length;
  if (n === 1) return a.frames[0];
  const seg = a.ms / n;
  const k = Math.floor((t % a.ms) / seg);
  let u = ((t % a.ms) - k * seg) / seg;
  const hold = a.hold?.[k] ?? 0; // part of the segment spent holding the keyframe
  u = hold ? Math.max(0, (u - hold) / (1 - hold)) : u;
  if (a.ease !== "linear") u = smooth(u);
  const p = full(a.frames[k]);
  const q = full(a.frames[(k + 1) % n]);
  const out = {} as Pose;
  for (const key of KEYS) {
    const a0 = p[key] as number;
    (out as Record<string, number>)[key] = a0 + ((q[key] as number) - a0) * u;
  }
  return out;
}

/* ---------- poses ---------- */

const stand: Pose = { torso: 2, nThigh: 0, nShin: 0, fThigh: 0, fShin: 0, nArm: 6, nFore: 14, fArm: -4, fFore: 8 };

/** Mirror the legs and arms (left becomes right), for alternating movements. */
const swap = (p: Pose): Pose => ({ ...p, nThigh: p.fThigh, nShin: p.fShin, nFoot: p.fFoot, fThigh: p.nThigh, fShin: p.nShin, fFoot: p.nFoot, nArm: p.fArm, nFore: p.fFore, fArm: p.nArm, fFore: p.nFore });

const runA: Pose = { torso: 8, nThigh: 62, nShin: 0, nFoot: 95, fThigh: -28, fShin: -60, fFoot: 40, nArm: -38, nFore: 50, fArm: 40, fFore: 120, lift: 4 };
const runB: Pose = { torso: 8, nThigh: 18, nShin: -10, fThigh: -6, fShin: -80, fFoot: 10, nArm: 8, nFore: 90, fArm: -8, fFore: 80, lift: 0 };
const skipA: Pose = { torso: 4, nThigh: 95, nShin: 5, nFoot: 100, fThigh: 0, fShin: 0, fFoot: 70, nArm: -35, nFore: 60, fArm: 45, fFore: 130, lift: 3 };
const skipC: Pose = { torso: 6, nThigh: 10, nShin: -150, nFoot: -60, fThigh: 0, fShin: 0, fFoot: 80, nArm: -30, nFore: 60, fArm: 35, fFore: 120, lift: 2 };

export const ANIMS = {
  run: { frames: [runA, runB, swap(runA), swap(runB)], ms: 720, ease: "linear" },
  skipA: { frames: [skipA, { ...stand, torso: 4, nArm: 0, nFore: 90, fArm: 0, fFore: 90, fFoot: 70, nFoot: 70 }, swap(skipA), { ...stand, torso: 4, nArm: 0, nFore: 90, fArm: 0, fFore: 90, fFoot: 70, nFoot: 70 }], ms: 900 },
  skipC: { frames: [skipC, { ...stand, torso: 6, nArm: 0, nFore: 90, fArm: 0, fFore: 90, nFoot: 75, fFoot: 75 }, swap(skipC), { ...stand, torso: 6, nArm: 0, nFore: 90, fArm: 0, fFore: 90, nFoot: 75, fFoot: 75 }], ms: 800 },
  squat: {
    frames: [
      { ...stand, nArm: 80, nFore: 85, fArm: 80, fFore: 85 },
      { torso: 38, nThigh: 95, nShin: -28, fThigh: 95, fShin: -28, nArm: 85, nFore: 88, fArm: 85, fFore: 88 },
    ],
    ms: 2600,
    hold: [0.15, 0.2],
  },
  lunge: {
    frames: [
      { ...stand, nArm: 0, nFore: 0, fArm: 0, fFore: 0 },
      { torso: 2, nThigh: 90, nShin: 0, fThigh: -40, fShin: -88, fFoot: 0, nArm: 0, nFore: 0, fArm: 0, fFore: 0 },
    ],
    ms: 2600,
    hold: [0.15, 0.2],
  },
  bridge: {
    frames: [
      { torso: -90, head: 0, nThigh: 125, nShin: 15, fThigh: 125, fShin: 15, nArm: 90, nFore: 90, fArm: 90, fFore: 90 },
      { torso: -112, head: 15, nThigh: 70, nShin: 5, fThigh: 70, fShin: 5, nArm: 68, nFore: 90, fArm: 68, fFore: 90 },
    ],
    ms: 2600,
    hold: [0.2, 0.3],
  },
  plank: {
    frames: [
      { torso: 90, head: -10, nThigh: -82, nShin: -82, nFoot: 0, fThigh: -82, fShin: -82, fFoot: 0, nArm: 0, nFore: 90, fArm: 0, fFore: 90 },
      { torso: 89, head: -10, nThigh: -83, nShin: -83, nFoot: 0, fThigh: -83, fShin: -83, fFoot: 0, nArm: 0, nFore: 90, fArm: 0, fFore: 90 },
    ],
    ms: 3000,
  },
  pushup: {
    frames: [
      { torso: 78, head: -8, nThigh: -100, nShin: -100, nFoot: -10, fThigh: -100, fShin: -100, fFoot: -10, nArm: 0, nFore: 0, fArm: 0, fFore: 0 },
      { torso: 88, head: -8, nThigh: -91, nShin: -91, nFoot: -10, fThigh: -91, fShin: -91, fFoot: -10, nArm: -50, nFore: 35, fArm: -50, fFore: 35 },
    ],
    ms: 2200,
    hold: [0.15, 0.1],
  },
  calf: {
    frames: [
      { ...stand, nArm: 0, nFore: 0, fArm: 0, fFore: 0 },
      { ...stand, nArm: 0, nFore: 0, fArm: 0, fFore: 0, nFoot: 38, fFoot: 38 },
    ],
    ms: 2000,
    hold: [0.2, 0.25],
  },
  rdl: {
    frames: [
      { ...stand, nArm: 0, nFore: 0, fArm: 0, fFore: 0 },
      { torso: 85, head: -5, nThigh: 6, nShin: 0, fThigh: -85, fShin: -85, fFoot: 0, nArm: 0, nFore: 0, fArm: 0, fFore: 0 },
    ],
    ms: 3000,
    hold: [0.15, 0.25],
  },
  swing: {
    frames: [
      { ...stand, nThigh: 60, nShin: 40, nFoot: 120, nArm: -25, nFore: -10, fArm: 15, fFore: 30 },
      { ...stand, nThigh: -35, nShin: -45, nFoot: 40, nArm: 25, nFore: 40, fArm: -15, fFore: 0 },
    ],
    ms: 1500,
  },
  deadbug: {
    frames: [
      { torso: -90, head: 0, nThigh: 180, nShin: 90, nFoot: 180, fThigh: 180, fShin: 90, fFoot: 180, nArm: 180, nFore: 180, fArm: 180, fFore: 180 },
      { torso: -90, head: 0, nThigh: 100, nShin: 100, nFoot: 190, fThigh: 180, fShin: 90, fFoot: 180, nArm: 180, nFore: 180, fArm: 255, fFore: 255 },
    ],
    ms: 2600,
    hold: [0.2, 0.2],
  },
  hipflexor: {
    frames: [
      { torso: 0, nThigh: 90, nShin: 0, fThigh: -10, fShin: -95, fFoot: 0, nArm: 170, nFore: 175, fArm: 0, fFore: 20 },
      { torso: -8, head: 5, nThigh: 80, nShin: -8, fThigh: -25, fShin: -110, fFoot: 0, nArm: 185, nFore: 195, fArm: 0, fFore: 20 },
    ],
    ms: 3200,
    hold: [0.2, 0.3],
  },
  stepup: {
    frames: [
      { ...stand, nThigh: 90, nShin: 0, nArm: -10, nFore: 30, fArm: 15, fFore: 40 },
      { ...stand, nThigh: 6, nShin: 0, fThigh: 60, fShin: -20, fFoot: 80, nArm: 30, nFore: 80, fArm: -25, fFore: 30, lift: 27, x: 27 },
    ],
    ms: 2200,
    hold: [0.15, 0.2],
  },
} satisfies Record<string, Anim>;

export type AnimKey = keyof typeof ANIMS;
/** Props drawn with the figure (a box for step-ups). */
export const PROPS: Partial<Record<AnimKey, "box" | "mat">> = { stepup: "box", bridge: "mat", deadbug: "mat", plank: "mat", pushup: "mat" };
