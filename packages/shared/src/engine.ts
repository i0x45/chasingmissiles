export type Mode = "survival" | "daily" | "practice";
export type Vec = { x: number; y: number };
export type Input = { turn: number; heading?: number; boost: boolean };
export type Tuning = {
  speed: number;
  turnRate: number;
  missileSpeed: number;
  missileTurn: number;
  spawnSeconds: number;
};
export const DEFAULT_TUNING: Tuning = {
  speed: 205,
  turnRate: 3.9,
  missileSpeed: 190,
  missileTurn: 1.12,
  spawnSeconds: 4.2,
};
export const STEP = 1 / 120;
export interface Missile extends Vec {
  id: number;
  a: number;
  age: number;
  kind: "seeker" | "dart";
  near: boolean;
  closest: number;
  awarded: boolean;
  dead: boolean;
}
export interface Pickup extends Vec {
  id: number;
  kind: "star" | "shield";
  age: number;
}
export interface Warning extends Vec {
  id: number;
  age: number;
  kind: Missile["kind"];
}
export type FlightEvent = {
  type: "star" | "near" | "destroy" | "shield" | "hit" | "crash" | "wave";
  x: number;
  y: number;
  value: number;
};
export interface World {
  width: number;
  height: number;
  seed: number;
  rng: number;
  tick: number;
  mode: Mode;
  alive: boolean;
  plane: Vec & { a: number };
  tuning: Tuning;
  missiles: Missile[];
  pickups: Pickup[];
  warnings: Warning[];
  events: FlightEvent[];
  score: number;
  stars: number;
  destroyed: number;
  nearMisses: number;
  combo: number;
  comboTime: number;
  energy: number;
  shield: number;
  grace: number;
  boosting: boolean;
  spawnIn: number;
  pickupIn: number;
  shieldIn: number;
  nextId: number;
  wave: number;
}
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function random(w: { rng: number }): number {
  w.rng = (w.rng + 0x6d2b79f5) >>> 0;
  let t = w.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (w: World, a: number, b: number) => a + random(w) * (b - a);
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (target: number, angle: number) =>
  Math.atan2(Math.sin(target - angle), Math.cos(target - angle));
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function pickup(w: World, kind: Pickup["kind"]) {
  w.pickups.push({
    id: w.nextId++,
    x: between(w, 60, w.width - 60),
    y: between(w, 100, w.height - 80),
    kind,
    age: 0,
  });
}
export function createWorld(
  seed: number,
  width = 1280,
  height = 720,
  mode: Mode = "survival",
  tuning: Partial<Tuning> = {},
): World {
  const w: World = {
    width,
    height,
    seed,
    rng: seed,
    tick: 0,
    mode,
    alive: true,
    plane: { x: width * 0.5, y: height * 0.58, a: -Math.PI / 2 },
    tuning: { ...DEFAULT_TUNING, ...tuning },
    missiles: [],
    pickups: [],
    warnings: [],
    events: [],
    score: 0,
    stars: 0,
    destroyed: 0,
    nearMisses: 0,
    combo: 1,
    comboTime: 0,
    energy: 1,
    shield: 0,
    grace: 2,
    boosting: false,
    spawnIn: 3.5,
    pickupIn: 2,
    shieldIn: 14,
    nextId: 1,
    wave: 1,
  };
  for (let i = 0; i < 6; i++) pickup(w, "star");
  return w;
}
function warn(w: World) {
  const side = Math.floor(random(w) * 4),
    margin = 25;
  let x = between(w, 80, w.width - 80),
    y = between(w, 80, w.height - 80);
  if (side === 0) x = margin;
  if (side === 1) x = w.width - margin;
  if (side === 2) y = margin;
  if (side === 3) y = w.height - margin;
  w.warnings.push({
    x,
    y,
    id: w.nextId++,
    age: 0,
    kind: w.tick * STEP > 35 && random(w) > 0.62 ? "dart" : "seeker",
  });
}
function event(w: World, type: FlightEvent["type"], at: Vec, value = 0) {
  w.events.push({ type, x: at.x, y: at.y, value });
}
function kill(w: World, m: Missile) {
  m.dead = true;
}
export function stepWorld(w: World, raw: Input): void {
  w.events = [];
  if (!w.alive) return;
  w.tick++;
  const t = w.tick * STEP,
    p = w.plane;
  w.grace = Math.max(0, w.grace - STEP);
  w.shield = Math.max(0, w.shield - STEP);
  w.comboTime = Math.max(0, w.comboTime - STEP);
  if (w.comboTime === 0) w.combo = 1;
  const newWave = 1 + Math.floor(t / 25);
  if (newWave > w.wave) {
    w.wave = newWave;
    event(w, "wave", p, newWave);
  }
  w.boosting = raw.boost && w.energy > 0.01;
  w.energy = clamp(w.energy + (w.boosting ? -0.37 : 0.13) * STEP, 0, 1);
  if (raw.heading !== undefined) {
    const target = (Math.round((raw.heading * 720) / Math.PI) * Math.PI) / 720;
    p.a += clamp(
      angleDelta(target, p.a),
      -w.tuning.turnRate * STEP,
      w.tuning.turnRate * STEP,
    );
  } else
    p.a +=
      (Math.round(clamp(raw.turn, -1, 1) * 100) / 100) *
      w.tuning.turnRate *
      STEP;
  p.a = angleDelta(p.a, 0);
  const speed = w.tuning.speed * (w.boosting ? 1.65 : 1);
  p.x += Math.cos(p.a) * speed * STEP;
  p.y += Math.sin(p.a) * speed * STEP;
  if (p.x < -20) p.x = w.width + 20;
  if (p.x > w.width + 20) p.x = -20;
  if (p.y < -20) p.y = w.height + 20;
  if (p.y > w.height + 20) p.y = -20;
  w.score += STEP * 2;
  w.spawnIn -= STEP;
  w.pickupIn -= STEP;
  w.shieldIn -= STEP;
  const cap = w.mode === "practice" ? 3 : Math.min(12, 3 + Math.floor(t / 12));
  if (w.spawnIn <= 0) {
    if (w.missiles.length + w.warnings.length < cap) warn(w);
    w.spawnIn =
      w.mode === "practice"
        ? 6
        : Math.max(1.35, w.tuning.spawnSeconds - t * 0.025);
  }
  for (const warning of w.warnings) {
    warning.age += STEP;
    if (warning.age >= 1.15) {
      w.missiles.push({
        ...warning,
        a: Math.atan2(p.y - warning.y, p.x - warning.x),
        age: 0,
        near: false,
        closest: Infinity,
        awarded: false,
        dead: false,
      });
    }
  }
  w.warnings = w.warnings.filter((a) => a.age < 1.15);
  if (w.pickupIn <= 0) {
    if (w.pickups.filter((a) => a.kind === "star").length < 7)
      pickup(w, "star");
    w.pickupIn = 2.5;
  }
  if (w.shieldIn <= 0) {
    if (!w.pickups.some((a) => a.kind === "shield")) pickup(w, "shield");
    w.shieldIn = 18;
  }
  for (const m of w.missiles) {
    m.age += STEP;
    const dart = m.kind === "dart",
      lead = dart ? 0.7 : 0,
      target = Math.atan2(
        p.y + Math.sin(p.a) * speed * lead - m.y,
        p.x + Math.cos(p.a) * speed * lead - m.x,
      );
    const turn = w.tuning.missileTurn * (dart ? 0.66 : 1);
    m.a += clamp(angleDelta(target, m.a), -turn * STEP, turn * STEP);
    const missileSpeed =
      (w.tuning.missileSpeed + Math.min(45, t * 0.35)) *
      (dart ? 1.3 : 1) *
      (w.mode === "practice" ? 0.78 : 1);
    m.x += Math.cos(m.a) * missileSpeed * STEP;
    m.y += Math.sin(m.a) * missileSpeed * STEP;
    const d = distance(m, p);
    if (d < 64 && m.age > 0.4) {
      m.near = true;
      m.closest = Math.min(m.closest, d);
    }
    if (d < 21 && w.grace <= 0) {
      kill(w, m);
      if (w.shield > 0) {
        w.shield = 0;
        w.grace = 1.6;
        event(w, "hit", p);
      } else {
        w.alive = false;
        event(w, "crash", p);
        return;
      }
    }
    if (m.near && !m.awarded && d > 82 && !m.dead) {
      m.awarded = true;
      w.nearMisses++;
      w.combo = Math.min(5, w.combo + 1);
      w.comboTime = 6;
      const bonus = 20 * w.combo;
      w.score += bonus;
      event(w, "near", p, bonus);
    }
    if (
      m.age > 17 ||
      m.x < -220 ||
      m.x > w.width + 220 ||
      m.y < -220 ||
      m.y > w.height + 220
    )
      kill(w, m);
  }
  for (let i = 0; i < w.missiles.length; i++) {
    const a = w.missiles[i];
    for (let j = i + 1; j < w.missiles.length; j++) {
      const b = w.missiles[j];
      if (
        !a.dead &&
        !b.dead &&
        a.age > 0.65 &&
        b.age > 0.65 &&
        distance(a, b) < 19
      ) {
        kill(w, a);
        kill(w, b);
        w.destroyed += 2;
        const bonus = 60 * w.combo;
        w.score += bonus;
        event(w, "destroy", { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, bonus);
      }
    }
  }
  w.missiles = w.missiles.filter((m) => !m.dead);
  w.pickups = w.pickups.filter((item) => {
    item.age += STEP;
    if (distance(item, p) < 31) {
      if (item.kind === "star") {
        w.stars++;
        const bonus = 25 * w.combo;
        w.score += bonus;
        event(w, "star", item, bonus);
      } else {
        w.shield = 10;
        event(w, "shield", p);
      }
      return false;
    }
    return item.kind === "star" || item.age < 22;
  });
}
export function advanceClock(
  carry: number,
  delta: number,
  run: () => void,
): number {
  let accumulated = carry + Math.min(Math.max(delta, 0), 0.15),
    steps = 0;
  while (accumulated >= STEP && steps < 18) {
    run();
    accumulated -= STEP;
    steps++;
  }
  return accumulated;
}
