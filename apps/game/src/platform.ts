import type { Save } from "@missiles/shared";
export class Feedback {
  private context: AudioContext | null = null;
  private last = 0;
  constructor(private settings: () => Save["settings"]) {}
  wake() {
    if (!this.settings().sound) return;
    this.context ??= new AudioContext();
    void this.context.resume();
  }
  play(
    kind:
      "star" | "near" | "destroy" | "hit" | "crash" | "shield" | "wave" | "tap",
  ) {
    if (
      this.settings().haptics &&
      (kind === "crash" || kind === "near" || kind === "hit") &&
      typeof navigator.vibrate === "function"
    )
      navigator.vibrate(kind === "crash" ? [30, 30, 50] : 15);
    if (!this.settings().sound) return;
    this.context ??= new AudioContext();
    const ctx = this.context;
    if (ctx.state !== "running") return;
    if (ctx.currentTime - this.last < 0.035) return;
    this.last = ctx.currentTime;
    const frequencies = {
      star: 1040,
      near: 760,
      destroy: 150,
      hit: 210,
      crash: 70,
      shield: 580,
      wave: 460,
      tap: 620,
    };
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    const length = kind === "crash" ? 0.5 : kind === "destroy" ? 0.22 : 0.12;
    osc.type = kind === "crash" || kind === "destroy" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(frequencies[kind], ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      frequencies[kind] * 0.5,
      ctx.currentTime + length,
    );
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + length);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + length);
  }
  mute() {
    if (this.context) void this.context.suspend();
  }
}
export function observeSafeAreas(callback: () => void) {
  const root = document.documentElement;
  new MutationObserver(callback).observe(root, {
    attributes: true,
    attributeFilter: ["style"],
  });
  window.addEventListener("orientationchange", callback);
  window.addEventListener("resize", callback);
  [100, 400, 1200].forEach((ms) => window.setTimeout(callback, ms));
}
