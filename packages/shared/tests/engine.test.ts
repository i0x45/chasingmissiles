import { describe, it, expect } from "vitest";
import {
  advanceClock,
  createWorld,
  stepWorld,
  hashSeed,
  random,
  STEP,
  type Missile,
} from "../src/engine";
import { parseSave, loadSave, writeSave, SAVE_KEY } from "../src/save";
const missile = (
  x: number,
  y: number,
  extra: Partial<Missile> = {},
): Missile => ({
  x,
  y,
  id: 90,
  a: 0,
  age: 1,
  kind: "seeker",
  near: false,
  closest: Infinity,
  awarded: false,
  dead: false,
  ...extra,
});
describe("deterministic simulation", () => {
  it("pins RNG and hash outputs", () => {
    expect(hashSeed("missiles")).toBe(2497851856);
    const rng = { rng: 123 };
    expect(random(rng)).toBe(0.7872516233474016);
  });
  it("replays the same seed and quantized inputs identically", () => {
    const a = createWorld(42),
      b = createWorld(42);
    a.grace = b.grace = 1000;
    for (let i = 0; i < 7200; i++) {
      const input = { turn: Math.sin(i / 700), boost: i % 900 < 120 };
      stepWorld(a, input);
      stepWorld(b, input);
    }
    expect(a.tick).toBe(7200);
    expect(a).toEqual(b);
  });
  it("matches 30fps and 120fps clocks", () => {
    const a = createWorld(8),
      b = createWorld(8);
    let ca = 0,
      cb = 0;
    for (let i = 0; i < 300; i++)
      ca = advanceClock(ca, 1 / 30, () =>
        stepWorld(a, { turn: 0.5, boost: false }),
      );
    for (let i = 0; i < 1200; i++)
      cb = advanceClock(cb, STEP, () =>
        stepWorld(b, { turn: 0.5, boost: false }),
      );
    expect(a).toEqual(b);
  });
  it("spawns warning before a missile", () => {
    const w = createWorld(3);
    w.spawnIn = 0;
    stepWorld(w, { turn: 0, boost: false });
    expect(w.warnings).toHaveLength(1);
    expect(w.missiles).toHaveLength(0);
    for (let i = 0; i < 140; i++) stepWorld(w, { turn: 0, boost: false });
    expect(w.missiles.length).toBeGreaterThan(0);
  });
  it("wraps edges without making a new world", () => {
    const w = createWorld(3);
    w.plane = { x: w.width + 19.9, y: 300, a: 0 };
    stepWorld(w, { turn: 0, boost: false });
    expect(w.plane.x).toBe(-20);
    expect(w.alive).toBe(true);
  });
  it("deducts boost and recharges when released", () => {
    const w = createWorld(3);
    for (let i = 0; i < 120; i++) stepWorld(w, { turn: 0, boost: true });
    const spent = w.energy;
    expect(spent).toBeLessThan(0.7);
    for (let i = 0; i < 120; i++) stepWorld(w, { turn: 0, boost: false });
    expect(w.energy).toBeGreaterThan(spent);
  });
  it("consumes shield on contact and grants grace", () => {
    const w = createWorld(3);
    w.shield = 10;
    w.grace = 0;
    w.missiles = [missile(w.plane.x, w.plane.y)];
    stepWorld(w, { turn: 0, boost: false });
    expect(w.alive).toBe(true);
    expect(w.shield).toBe(0);
    expect(w.grace).toBeGreaterThan(1);
  });
  it("ends a flight on an unprotected hit", () => {
    const w = createWorld(3);
    w.grace = 0;
    w.missiles = [missile(w.plane.x, w.plane.y)];
    stepWorld(w, { turn: 0, boost: false });
    expect(w.alive).toBe(false);
    expect(w.events.some((e) => e.type === "crash")).toBe(true);
  });
  it("awards close call only after escaping and only once", () => {
    const w = createWorld(3);
    const m = missile(w.plane.x + 50, w.plane.y);
    w.missiles = [m];
    stepWorld(w, { turn: 0, boost: false });
    expect(w.nearMisses).toBe(0);
    m.x = w.plane.x + 100;
    stepWorld(w, { turn: 0, boost: false });
    expect(w.nearMisses).toBe(1);
    m.x = w.plane.x + 110;
    stepWorld(w, { turn: 0, boost: false });
    expect(w.nearMisses).toBe(1);
  });
  it("destroys two armed missiles and awards a bonus", () => {
    const w = createWorld(3);
    w.missiles = [missile(100, 100), missile(105, 100, { id: 91 })];
    stepWorld(w, { turn: 0, boost: false });
    expect(w.missiles).toHaveLength(0);
    expect(w.destroyed).toBe(2);
    expect(w.score).toBeGreaterThanOrEqual(60);
  });
  it("collects stars and leaves distant stars untouched", () => {
    const w = createWorld(3);
    w.pickups = [
      { ...w.plane, id: 1, kind: "star", age: 0 },
      { x: 50, y: 50, id: 2, kind: "star", age: 0 },
    ];
    stepWorld(w, { turn: 0, boost: false });
    expect(w.stars).toBe(1);
    expect(w.pickups).toHaveLength(1);
  });
});
describe("resilient save", () => {
  it("repairs malformed fields independently", () => {
    const s = parseSave(
      JSON.stringify({
        best: 320,
        totalStars: -4,
        flights: 8,
        settings: { sound: true, haptics: "bad" },
        dailyBest: { good: 45, bad: "broken" },
      }),
    );
    expect(s.best).toBe(320);
    expect(s.totalStars).toBe(0);
    expect(s.flights).toBe(8);
    expect(s.settings.sound).toBe(true);
    expect(s.settings.haptics).toBe(true);
    expect(s.dailyBest).toEqual({ good: 45 });
  });
  it("heals corrupt JSON", () => {
    expect(parseSave("{bad").best).toBe(0);
    expect(parseSave("null").version).toBe(2);
  });
  it("migrates the previous prototype best", () => {
    const s = loadSave({
      getItem: (key) => (key === "sky-run-best" ? "150" : null),
      setItem: () => {},
    });
    expect(s.best).toBe(150);
  });
  it("survives blocked browser storage", () => {
    const store = {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    };
    expect(loadSave(store).version).toBe(2);
    expect(writeSave(store, parseSave(null))).toBe(false);
  });
  it("round trips a valid save", () => {
    let raw: string | null = null;
    const store = {
      getItem: (key: string) => (key === SAVE_KEY ? raw : null),
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    };
    const s = parseSave(null);
    s.totalStars = 55;
    writeSave(store, s);
    expect(loadSave(store)).toEqual(s);
  });
});
