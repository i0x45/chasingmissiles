import Phaser from "phaser";
import {
  advanceClock,
  createWorld,
  stepWorld,
  random,
  STEP,
  type World,
  type Mode,
  type Tuning,
  type FlightEvent,
  type Save,
  type Vec,
} from "@missiles/shared";
type Callbacks = {
  settings: () => Save["settings"];
  color: () => number;
  event: (e: FlightEvent) => void;
  frame: (w: World) => void;
  end: (w: World) => void;
  ready: () => void;
};
type Trail = Vec & { life: number; max: number; size: number; color: number };
type Particle = Trail & { vx: number; vy: number };
export class FlightScene extends Phaser.Scene {
  world: World | null = null;
  status: "menu" | "playing" | "paused" | "dead" = "menu";
  tuning: Partial<Tuning> = {};
  private ink!: Phaser.GameObjects.Graphics;
  private background!: Phaser.GameObjects.Graphics;
  private carry = 0;
  private clock = 0;
  private frameClock = 0;
  private lastPlane: Vec & { a: number } = { x: 0, y: 0, a: 0 };
  private trails: Trail[] = [];
  private particles: Particle[] = [];
  private keyboard!: Record<string, Phaser.Input.Keyboard.Key>;
  private joystick: {
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null = null;
  touchBoost = false;
  private visual = { rng: 731 };
  private cb: Callbacks;
  private clouds = Array.from({ length: 12 }, (_, i) => ({
    x: ((i * 313) % 997) / 997,
    y: ((i * 173) % 911) / 911,
    r: 35 + ((i * 11) % 70),
  }));
  constructor(callbacks: Callbacks) {
    super("Flight");
    this.cb = callbacks;
  }
  create() {
    this.background = this.add.graphics();
    this.ink = this.add.graphics();
    this.keyboard = this.input.keyboard!.addKeys(
      "LEFT,RIGHT,A,D,SPACE",
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.status === "playing")
        this.joystick = { id: p.id, x: p.x, y: p.y, dx: 0, dy: 0 };
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.joystick?.id === p.id) {
        this.joystick.dx = p.x - this.joystick.x;
        this.joystick.dy = p.y - this.joystick.y;
      }
    });
    this.input.on("pointerup", () => {
      this.joystick = null;
    });
    this.input.on("pointerupoutside", () => {
      this.joystick = null;
    });
    this.cb.ready();
  }
  start(seed: number, mode: Mode) {
    this.world = createWorld(
      seed,
      this.scale.width,
      this.scale.height,
      mode,
      this.tuning,
    );
    this.lastPlane = { ...this.world.plane };
    this.status = "playing";
    this.carry = 0;
    this.trails = [];
    this.particles = [];
    this.clearInput();
  }
  clearInput() {
    this.joystick = null;
    this.touchBoost = false;
    this.input.keyboard?.resetKeys();
  }
  pause() {
    if (this.status === "playing") {
      this.status = "paused";
      this.clearInput();
      this.carry = 0;
    }
  }
  resume() {
    if (this.status === "paused") {
      this.status = "playing";
      this.clearInput();
    }
  }
  menu() {
    this.status = "menu";
    this.world = null;
    this.trails = [];
    this.clearInput();
  }
  private noise() {
    return random(this.visual);
  }
  private burst(x: number, y: number, color: number, count: number) {
    const n = this.cb.settings().reduceMotion ? Math.min(5, count) : count;
    for (let i = 0; i < n; i++) {
      const a = this.noise() * Math.PI * 2,
        s = 35 + this.noise() * 170;
      const p = {
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + this.noise() * 0.5,
        max: 0.85,
        size: 2 + this.noise() * 3,
        color,
      };
      if (this.particles.length < 300) this.particles.push(p);
    }
  }
  update(_now: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.1);
    if (this.status !== "paused") this.clock += dt;
    const w = this.world;
    if (w && this.status === "playing") {
      const turn =
        (this.keyboard.RIGHT.isDown || this.keyboard.D.isDown ? 1 : 0) -
        (this.keyboard.LEFT.isDown || this.keyboard.A.isDown ? 1 : 0);
      const stick = this.joystick;
      const heading =
        stick && Math.hypot(stick.dx, stick.dy) > 12
          ? Math.atan2(stick.dy, stick.dx)
          : undefined;
      this.carry = advanceClock(this.carry, dt, () => {
        this.lastPlane = { ...w.plane };
        stepWorld(w, {
          turn,
          heading,
          boost: this.touchBoost || this.keyboard.SPACE.isDown,
        });
        if (w.tick % 4 === 0) {
          const p = w.plane;
          this.trails.push({
            x: p.x - Math.cos(p.a) * 17,
            y: p.y - Math.sin(p.a) * 17,
            life: 0.8,
            max: 0.8,
            size: w.boosting ? 4 : 2,
            color: w.boosting ? 0xffe5b2 : 0xfcfff0,
          });
        }
        if (w.tick % 6 === 0)
          for (const m of w.missiles)
            this.trails.push({
              x: m.x,
              y: m.y,
              life: 1.6,
              max: 1.6,
              size: 2.5,
              color: 0xf6f5df,
            });
        for (const e of w.events) {
          if (["destroy", "crash", "hit", "star"].includes(e.type))
            this.burst(
              e.x,
              e.y,
              e.type === "star" ? 0xffe39a : 0xef9460,
              e.type === "crash" ? 65 : 26,
            );
          if (
            (e.type === "crash" || e.type === "destroy") &&
            !this.cb.settings().reduceMotion
          )
            this.cameras.main.shake(
              e.type === "crash" ? 230 : 90,
              e.type === "crash" ? 0.007 : 0.002,
            );
          this.cb.event(e);
        }
        if (!w.alive && this.status === "playing") {
          this.status = "dead";
          this.clearInput();
          this.cb.end(w);
        }
      });
    }
    this.renderSky(this.cb.settings().reduceMotion ? 0 : this.clock);
    this.renderEntities(this.status === "paused" ? 0 : dt);
    if (w) {
      this.frameClock += dt;
      if (this.frameClock > 0.08) {
        this.cb.frame(w);
        this.frameClock = 0;
      }
    }
    const knob = document.getElementById("stick");
    if (knob) {
      const d = this.joystick,
        len = d ? Math.hypot(d.dx, d.dy) : 0;
      knob.style.transform =
        d && len > 0
          ? `translate(${(d.dx / len) * Math.min(26, len)}px,${(d.dy / len) * Math.min(26, len)}px)`
          : "";
    }
  }
  private renderSky(time: number) {
    const g = this.background,
      W = this.scale.width,
      H = this.scale.height;
    g.clear();
    g.fillStyle(0xa9d9c8);
    g.fillRect(0, 0, W, H);
    // A faint survey grid and distant islands give scale without obscuring threats.
    g.lineStyle(1, 0x39795d, 0.07);
    for (let x = 40; x < W; x += 80)
      for (let y = 30; y < H; y += 80) {
        g.lineBetween(x - 2, y, x + 2, y);
        g.lineBetween(x, y - 2, x, y + 2);
      }
    g.fillStyle(0x83bba1, 0.16);
    g.fillEllipse(-35, H * 0.7, 220, 400);
    g.fillEllipse(W * 0.91, -45, 420, 230);
    g.lineStyle(1, 0x6aaa8d, 0.12);
    g.strokeEllipse(-25, H * 0.7, 260, 450);
    g.strokeEllipse(W * 0.91, -45, 470, 270);
    g.fillStyle(0xeffbe8, 0.36);
    for (const c of this.clouds) {
      const x = ((c.x * W + time * 2 + 130) % (W + 260)) - 130,
        y = c.y * H;
      g.fillCircle(x, y, c.r);
      g.fillCircle(x + c.r * 0.7, y + c.r * 0.14, c.r * 0.7);
      g.fillCircle(x - c.r * 0.64, y + c.r * 0.13, c.r * 0.68);
    }
    if (this.status === "menu") {
      g.lineStyle(2, 0xfaffed, 0.6);
      for (let i = 0; i < 95; i++) {
        const a = (i / 95) * Math.PI * 2;
        const b = a + 0.03;
        g.lineBetween(
          W * 0.5 + Math.cos(a) * W * 0.36,
          H * 0.55 + Math.sin(a) * H * 0.31,
          W * 0.5 + Math.cos(b) * W * 0.36,
          H * 0.55 + Math.sin(b) * H * 0.31,
        );
      }
      this.plane(g, W * 0.18, H * 0.6, -0.8, this.cb.color());
      this.missile(g, W * 0.82, H * 0.34, 2.6, "seeker", time);
    }
  }
  private plane(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    a: number,
    color: number,
  ) {
    const shape = [
      [-2, -29],
      [3, -26],
      [5, -10],
      [27, 8],
      [26, 13],
      [5, 5],
      [4, 19],
      [12, 25],
      [11, 29],
      [0, 24],
      [-11, 29],
      [-12, 25],
      [-4, 19],
      [-5, 5],
      [-26, 13],
      [-27, 8],
      [-5, -10],
      [-3, -26],
    ];
    const points = (coords: number[][], ox = 0, oy = 0) =>
      coords.map(([vx, vy]) => ({
        x:
          x +
          vx * Math.cos(a + Math.PI / 2) -
          vy * Math.sin(a + Math.PI / 2) +
          ox,
        y:
          y +
          vx * Math.sin(a + Math.PI / 2) +
          vy * Math.cos(a + Math.PI / 2) +
          oy,
      }));
    g.fillStyle(0x275f4e, 0.15);
    g.fillPoints(points(shape, 3, 6), true);
    g.fillStyle(0xfff8df);
    g.fillPoints(points(shape), true);
    g.fillStyle(color);
    g.fillPoints(
      points([
        [0, -29],
        [4, -16],
        [4, 19],
        [0, 24],
        [-4, 19],
        [-4, -16],
      ]),
      true,
    );
    g.fillPoints(
      points([
        [-23, 6],
        [-10, 2],
        [-10, 7],
        [-23, 12],
      ]),
      true,
    );
    g.fillPoints(
      points([
        [23, 6],
        [10, 2],
        [10, 7],
        [23, 12],
      ]),
      true,
    );
    g.fillStyle(0x254b4d);
    g.fillPoints(
      points([
        [-2, -14],
        [2, -14],
        [3, -4],
        [-3, -4],
      ]),
      true,
    );
  }
  private missile(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    a: number,
    kind: "seeker" | "dart",
    time: number,
  ) {
    const rotate = (v: number[][]) =>
      v.map(([vx, vy]) => ({
        x: x + Math.cos(a) * vx - Math.sin(a) * vy,
        y: y + Math.sin(a) * vx + Math.cos(a) * vy,
      }));
    g.fillStyle(0xf5b46e);
    g.fillPoints(
      rotate([
        [-8, -3],
        [-18 - Math.sin(time * 38) * 3, 0],
        [-8, 3],
      ]),
      true,
    );
    g.fillStyle(kind === "dart" ? 0x6e595b : 0x355f54);
    g.fillPoints(
      rotate([
        [15, 0],
        [6, 4],
        [-6, 4],
        [-12, 8],
        [-10, 0],
        [-12, -8],
        [-6, -4],
        [6, -4],
      ]),
      true,
    );
    g.fillStyle(kind === "dart" ? 0xfbd68a : 0xf07c45);
    g.fillPoints(
      rotate([
        [15, 0],
        [7, 4],
        [7, -4],
      ]),
      true,
    );
  }
  private star(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    r: number,
  ) {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (i * Math.PI) / 5 - Math.PI / 2,
        d = i % 2 ? r * 0.45 : r;
      return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    });
    g.fillPoints(pts, true);
  }
  private renderEntities(dt: number) {
    const g = this.ink;
    g.clear();
    const w = this.world;
    this.trails = this.trails
      .filter((t) => {
        t.life -= dt;
        if (t.life <= 0) return false;
        g.fillStyle(t.color, (t.life / t.max) * 0.48);
        g.fillCircle(t.x, t.y, t.size);
        return true;
      })
      .slice(-1000);
    if (w) {
      for (const item of w.pickups) {
        const pulse = 1 + Math.sin(this.clock * 3 + item.id) * 0.07;
        g.fillStyle(0xfffcdf, 0.95);
        g.fillCircle(item.x, item.y, (item.kind === "star" ? 12 : 18) * pulse);
        if (item.kind === "star") {
          g.fillStyle(0xeab44d);
          this.star(g, item.x, item.y, 7 * pulse);
        } else {
          g.lineStyle(2.5, 0x4c9980);
          g.strokePoints(
            [
              { x: item.x, y: item.y - 10 },
              { x: item.x + 8, y: item.y - 6 },
              { x: item.x + 7, y: item.y + 4 },
              { x: item.x, y: item.y + 10 },
              { x: item.x - 7, y: item.y + 4 },
              { x: item.x - 8, y: item.y - 6 },
            ],
            true,
          );
          g.lineStyle(1, 0xffffff, 0.6);
          g.strokeCircle(item.x, item.y, 24 + Math.sin(this.clock * 4) * 2);
        }
      }
      for (const warning of w.warnings) {
        const alpha = 0.35 + 0.55 * Math.abs(Math.sin(this.clock * 8));
        g.lineStyle(2, 0xe2693d, alpha);
        g.strokeCircle(warning.x, warning.y, 23 - warning.age * 7);
        g.fillStyle(0xe2693d, alpha);
        g.fillTriangle(
          warning.x,
          warning.y - 9,
          warning.x - 8,
          warning.y + 7,
          warning.x + 8,
          warning.y + 7,
        );
        g.fillStyle(0xfff6dc);
        g.fillRect(warning.x - 1, warning.y - 5, 2, 5);
        g.fillCircle(warning.x, warning.y + 3, 1);
      }
      for (const m of w.missiles) {
        this.missile(g, m.x, m.y, m.a, m.kind, this.clock);
        if (m.age > 14) {
          g.lineStyle(1, 0xf7f1d0, 0.5);
          g.strokeCircle(m.x, m.y, 18);
        }
      }
      if (w.alive) {
        const p = w.plane,
          previous = this.lastPlane;
        const ratio = this.status === "playing" ? this.carry / STEP : 1;
        const smooth =
          Math.abs(previous.x - p.x) > 100 || Math.abs(previous.y - p.y) > 100
            ? p
            : {
                x: previous.x + (p.x - previous.x) * ratio,
                y: previous.y + (p.y - previous.y) * ratio,
                a: p.a,
              };
        if (w.shield > 0) {
          g.fillStyle(0xf7ffef, 0.1);
          g.fillCircle(smooth.x, smooth.y, 38);
          g.lineStyle(2, 0xfbfff2, 0.85);
          g.strokeCircle(smooth.x, smooth.y, 37 + Math.sin(this.clock * 4) * 2);
        }
        if (w.grace <= 0 || Math.floor(this.clock * 9) % 2 === 0)
          this.plane(g, smooth.x, smooth.y, p.a, this.cb.color());
      }
    }
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle(p.color, p.life / p.max);
      g.fillCircle(p.x, p.y, (p.size * p.life) / p.max);
      return true;
    });
  }
}
