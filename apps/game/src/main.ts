import Phaser from "phaser";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "./style.css";
import {
  hashSeed,
  loadSave,
  writeSave,
  PLANES,
  DEFAULT_TUNING,
  STEP,
  type Mode,
  type World,
  type FlightEvent,
  type Tuning,
  type StorageAdapter,
} from "@missiles/shared";
import { FlightScene } from "./FlightScene";
import { Feedback, observeSafeAreas } from "./platform";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const store: StorageAdapter = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
const save = loadSave(store);
if (!PLANES.some((p) => p.id === save.selected && save.totalStars >= p.cost))
  save.selected = "ember";
let mode: Mode = "survival",
  toastTimer = 0,
  resultTimer = 0,
  completed = new Set<string>();
const dailyKey = () => new Date().toISOString().slice(0, 10);
const feedback = new Feedback(() => save.settings);
$("app").innerHTML =
  `<header><a class="brand" href="./"><span class="brand-icon">✈</span>MISSILES<span class="edition">SKY RUN</span></a><div class="header-right"><span><i class="live-dot"></i> A LITTLE CLOSER TO DANGER</span><button id="sound" class="icon-btn">SOUND OFF</button><button id="settings" class="icon-btn square" aria-label="Settings">⚙</button></div></header>
<main><div class="intro"><div><div class="eyebrow">AN OPEN-SKY SURVIVAL GAME</div><h1>Stay one turn ahead.</h1></div><p>A small plane. A very big sky.<br>How long can you stay in it?</p></div>
<section class="game" id="arena" aria-label="Missiles flight arena"><div id="sky" role="img" aria-label="Plane flying through a sky with stars and pursuing missiles"></div>
<div class="hud"><div class="metric"><label>SCORE</label><strong id="score">0000</strong></div><div class="hud-center"><span id="status">CLEARED FOR TAKEOFF</span><b id="combo"></b><div class="combo-meter" id="comboMeter" hidden><i id="comboBar"></i></div></div><div class="hud-right"><div class="metric small"><label id="bestLabel">PERSONAL BEST</label><strong id="best">0</strong></div><button class="icon-btn square" id="pause" aria-label="Pause flight" hidden>Ⅱ</button><button class="icon-btn square" id="expand" aria-label="Expand game">⛶</button></div></div>
<div class="missions" id="missions" hidden><span id="missionStars">○ COLLECT 6 STARS · 0/6</span><span id="missionTime">○ STAY AIRBORNE · 0/45s</span><span id="missionKills">○ OUTSMART 4 MISSILES · 0/4</span></div><div class="toast" id="toast" role="status" aria-live="polite"></div>
<div id="overlay" class="overlay"><div class="eyebrow" id="flightLabel">YOUR NEXT GREAT ESCAPE</div><div class="plane-mark">✈</div><h2 id="title">The sky is yours.<br>For now.</h2><p id="description">Collect stars. Dodge trouble.<br>Turn a close call into your next high score.</p>
<div class="result-grid" id="results" hidden></div><div class="result-summary" id="resultSummary" hidden></div>
<div class="modes" id="modes" aria-label="Game mode"><button data-mode="survival" aria-pressed="true">SURVIVAL</button><button data-mode="daily" aria-pressed="false">DAILY FLIGHT</button><button data-mode="practice" aria-pressed="false">PRACTICE</button></div>
<button id="start" class="primary" disabled>PREPARING SKY… <span>↗</span></button><div class="start-hint" id="startHint">ARROWS TO STEER · SPACE TO BOOST · EDGES WRAP</div><button id="help" class="text-btn">First flight? Here’s how.</button><button id="home" class="text-btn" hidden>Back to the hangar</button></div>
<div class="bottom-hud"><span id="time">00:00 <i>FLIGHT TIME</i></span><div class="flight-tools"><span id="stars" class="stars-label">✦ 0</span><span id="shield" class="shield-info">◇ SHIELD PICKUPS</span><div class="boost-meter">BOOST <span><i id="energy"></i></span></div></div></div>
<div class="touch-controls" id="touchControls" hidden><div class="joystick"><div id="stick"></div></div><button class="touch-boost" id="boost" aria-label="Hold to boost">↗<small>BOOST</small></button></div></section>
<section class="below"><div class="control"><span class="key">←</span><span class="key">→</span><div><b>Find your flow</b><p>A / D or arrows to turn · drag to steer on touch</p></div></div><div class="control"><span class="key wide">SPACE</span><div><b>Get some breathing room</b><p>Hold to boost · release to recharge</p></div></div><div class="tip"><span>✦</span><p>Close calls build your combo.<br>Lure missiles into each other for bonus points.</p></div></section>
<section class="hangar"><div class="hangar-label">YOUR LITTLE FLEET<small id="bank">0 stars collected · same handling, your style</small></div><div class="plane-options" id="planes"></div></section><footer><span>ONE PLANE. ENDLESS POSSIBILITIES.</span><span>MADE FOR THE CLOSE CALLS <b>↗</b></span></footer></main>
<dialog id="settingsDialog"><div class="dialog-top"><h2>Flight settings</h2><button class="icon-btn square" data-close="settingsDialog" aria-label="Close settings">×</button></div><label class="setting-row"><span>Sound effects<small>A little feedback for every escape.</small></span><input id="settingSound" type="checkbox"></label><label class="setting-row"><span>Haptics<small>Light vibration on supported phones.</small></span><input id="settingHaptics" type="checkbox"></label><label class="setting-row"><span>Reduce motion<small>Less movement, fewer effects, no screen shake.</small></span><input id="settingMotion" type="checkbox"></label><p class="dialog-note">Progress stays on this device. Flights work offline after the game has loaded.</p></dialog>
<dialog id="helpDialog"><div class="dialog-top"><h2>A pilot’s field guide</h2><button class="icon-btn square" data-close="helpDialog" aria-label="Close flight guide">×</button></div><ul><li>Your plane flies forward automatically. Use <b>← / → or A / D</b> to turn. On touch, press and drag in the direction you want to fly.</li><li>Fly off an edge and come back on the opposite side.</li><li>Collect <b>✦ stars</b> for points and plane unlocks.</li><li>An orange warning means a missile arrives in one second. Turn around it or lure it into another missile.</li><li>Escape a close pass to build a <b>×5 combo</b>. Keep making close calls before it fades.</li><li>Hold <b>Space or BOOST</b> for speed. Release to recharge. Shield pickups protect you from one hit for up to ten seconds.</li><li><b>P / Esc</b> pauses. Practice has slower missiles and doesn’t affect records or unlocks.</li><li>Daily Flight repeats a UTC date seed. Your daily best stays on this device; matching courses also need matching screen dimensions.</li></ul></dialog>`;
const persist = () => {
  if (!writeSave(store, save))
    toast("Storage unavailable · progress lasts for this session");
};
function toast(text: string) {
  window.clearTimeout(toastTimer);
  $("toast").textContent = text;
  toastTimer = window.setTimeout(() => ($("toast").textContent = ""), 2400);
}
function renderHangar() {
  $("bank").textContent =
    `${save.totalStars} stars collected · same handling, your style`;
  $("planes").innerHTML = PLANES.map((p) => {
    const unlocked = save.totalStars >= p.cost;
    return `<button class="plane-option" data-plane="${p.id}" aria-pressed="${save.selected === p.id}" ${!unlocked ? "disabled" : ""}><span class="mini-plane" style="color:#${p.color.toString(16)}">✈</span><span>${p.name}<small>${unlocked ? p.label : `${save.totalStars}/${p.cost} STARS TO UNLOCK`}</small></span></button>`;
  }).join("");
  $("planes")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach(
      (b) =>
        (b.onclick = () => {
          const p = PLANES.find((p) => p.id === b.dataset.plane);
          if (p && save.totalStars >= p.cost) {
            save.selected = p.id;
            persist();
            renderHangar();
            feedback.play("tap");
          }
        }),
    );
}
function updateBest() {
  $("bestLabel").textContent =
    mode === "daily"
      ? "DAILY BEST"
      : mode === "practice"
        ? "TRAINING"
        : "PERSONAL BEST";
  $("best").textContent =
    mode === "daily"
      ? String(save.dailyBest[dailyKey()] || 0)
      : mode === "practice"
        ? "—"
        : String(save.best);
}
function showMenu() {
  window.clearTimeout(resultTimer);
  scene.menu();
  $("arena").classList.remove("playing");
  $("overlay").hidden = false;
  $("title").innerHTML = "The sky is yours.<br>For now.";
  $("description").innerHTML =
    "Collect stars. Dodge trouble.<br>Turn a close call into your next high score.";
  $("flightLabel").textContent = "YOUR NEXT GREAT ESCAPE";
  $("start").innerHTML = "LET’S FLY <span>↗</span>";
  $("startHint").textContent = "ARROWS TO STEER · SPACE TO BOOST · EDGES WRAP";
  [
    "results",
    "resultSummary",
    "pause",
    "missions",
    "home",
    "touchControls",
  ].forEach((id) => ($(id).hidden = true));
  $("modes").hidden = false;
  $("help").hidden = false;
  $("score").textContent = "0000";
  $("combo").textContent = "";
  $("comboMeter").hidden = true;
  $("status").textContent = "CLEARED FOR TAKEOFF";
  $("toast").textContent = "";
  $("stars").textContent = "✦ 0";
  $("time").innerHTML = "00:00 <i>FLIGHT TIME</i>";
  $("energy").style.width = "100%";
  $("shield").textContent = "◇ SHIELD PICKUPS";
  updateBest();
}
function start() {
  if (scene.status === "paused") {
    resume();
    return;
  }
  window.clearTimeout(resultTimer);
  feedback.wake();
  feedback.play("tap");
  const seed =
    mode === "daily"
      ? hashSeed(`missiles-daily-v1:${dailyKey()}`)
      : crypto.getRandomValues(new Uint32Array(1))[0];
  scene.start(seed, mode);
  completed = new Set();
  $("overlay").hidden = true;
  $("missions").hidden = mode === "practice";
  $("pause").hidden = false;
  $("touchControls").hidden = false;
  $("arena").classList.add("playing");
  $("toast").textContent = "";
  updateBest();
}
function pause() {
  if (scene.status !== "playing") return;
  scene.pause();
  feedback.mute();
  $("overlay").hidden = false;
  $("title").innerHTML = "Catch your<br>breath.";
  $("description").textContent = "Your flight is waiting right here.";
  $("flightLabel").textContent = "FLIGHT PAUSED";
  $("start").innerHTML = "RESUME FLIGHT <span>↗</span>";
  $("startHint").textContent = "PRESS P OR ESC TO RESUME";
  ["modes", "results", "resultSummary", "help", "touchControls"].forEach(
    (id) => ($(id).hidden = true),
  );
  $("home").hidden = false;
}
function resume() {
  scene.resume();
  feedback.wake();
  $("overlay").hidden = true;
  $("touchControls").hidden = false;
}
function togglePause() {
  if (scene.status === "playing") pause();
  else if (scene.status === "paused") resume();
}
function updateFrame(w: World) {
  const seconds = w.tick * STEP;
  $("score").textContent = String(Math.floor(w.score)).padStart(4, "0");
  $("time").innerHTML =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")} <i>FLIGHT TIME</i>`;
  $("stars").textContent = `✦ ${w.stars}`;
  $("combo").textContent = w.combo > 1 ? `×${w.combo} CLOSE-CALL COMBO` : "";
  $("comboMeter").hidden = w.combo === 1;
  $("comboBar").style.width = `${(w.comboTime / 6) * 100}%`;
  $("energy").style.width = `${w.energy * 100}%`;
  $("energy").style.background = w.boosting ? "#ed7546" : "#487e68";
  $("shield").textContent =
    w.shield > 0 ? `◈ SHIELD ${Math.ceil(w.shield)}s` : "◇ WATCH FOR SHIELDS";
  $("status").textContent =
    mode === "practice"
      ? "PRACTICE · NO PRESSURE"
      : `THREAT LEVEL ${w.wave} / ${w.missiles.length} ON YOUR TAIL`;
  const missions = [
    { id: "missionStars", label: "COLLECT 6 STARS", n: w.stars, max: 6 },
    {
      id: "missionTime",
      label: "STAY AIRBORNE",
      n: Math.floor(seconds),
      max: 45,
    },
    {
      id: "missionKills",
      label: "OUTSMART 4 MISSILES",
      n: w.destroyed,
      max: 4,
    },
  ];
  for (const m of missions) {
    const done = m.n >= m.max;
    $(m.id).textContent =
      `${done ? "✓" : "○"} ${m.label} · ${Math.min(m.n, m.max)}/${m.max}`;
    $(m.id).classList.toggle("complete", done);
    if (done && !completed.has(m.id) && mode !== "practice") {
      completed.add(m.id);
      toast(`FLIGHT GOAL COMPLETE · ${m.label}`);
    }
  }
  if (import.meta.env.DEV) {
    const el = document.getElementById("debugStats");
    if (el)
      el.textContent = `120 Hz physics · ${Math.round(scene.game.loop.actualFps)} FPS\nseed ${w.seed} · tick ${w.tick}\n${w.width} × ${w.height} · ${w.missiles.length} missiles`;
  }
}
function onEvent(e: FlightEvent) {
  feedback.play(e.type);
  if (e.type === "near") toast(`CLOSE CALL  +${e.value}`);
  if (e.type === "destroy") toast(`OUTSMARTED  +${e.value}`);
  if (e.type === "shield") toast("SHIELD UP · 10 SECONDS");
  if (e.type === "hit") toast("SHIELD SAVED YOU");
  if (e.type === "wave") toast(`THREAT LEVEL ${e.value} · STAY SHARP`);
}
function end(w: World) {
  $("pause").hidden = true;
  $("touchControls").hidden = true;
  const points = Math.floor(w.score),
    old = mode === "daily" ? save.dailyBest[dailyKey()] || 0 : save.best,
    record = points > old && mode !== "practice";
  if (mode !== "practice") {
    save.totalStars += w.stars;
    save.flights++;
    if (mode === "daily") {
      save.dailyBest[dailyKey()] = Math.max(old, points);
      const entries = Object.entries(save.dailyBest)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 30);
      save.dailyBest = Object.fromEntries(entries);
    } else save.best = Math.max(save.best, points);
    persist();
    renderHangar();
    updateBest();
  }
  resultTimer = window.setTimeout(() => {
    $("overlay").hidden = false;
    $("title").innerHTML = record
      ? "You made<br>your mark."
      : "One more<br>great escape?";
    $("description").textContent =
      mode === "practice"
        ? "A little practice. A little more confidence."
        : record
          ? "A new best. The sky will remember this one."
          : "A good pilot always has another flight in them.";
    $("flightLabel").textContent =
      mode === "daily"
        ? `DAILY FLIGHT / ${dailyKey()} UTC`
        : mode === "practice"
          ? "PRACTICE FLIGHT COMPLETE"
          : record
            ? "NEW PERSONAL BEST"
            : "FLIGHT COMPLETE";
    $("results").hidden = false;
    $("results").innerHTML =
      `<div><strong>${points}</strong><span>POINTS</span></div><div><strong>${Math.floor(w.tick * STEP)}s</strong><span>AIRBORNE</span></div><div><strong>${w.stars}</strong><span>STARS</span></div><div><strong>${w.nearMisses}</strong><span>CLOSE CALLS</span></div>`;
    $("resultSummary").hidden = false;
    $("resultSummary").textContent =
      `${w.destroyed} missiles outsmarted · ${mode === "practice" ? "Practice doesn’t affect records" : `${completed.size}/3 flight goals completed`}`;
    $("start").innerHTML = "FLY AGAIN <span>↗</span>";
    $("startHint").textContent = "PRESS ENTER FOR ANOTHER FLIGHT";
    $("modes").hidden = true;
    $("help").hidden = true;
    $("home").hidden = false;
  }, 650);
}
const scene = new FlightScene({
  settings: () => save.settings,
  color: () => PLANES.find((p) => p.id === save.selected)!.color,
  event: onEvent,
  frame: updateFrame,
  end,
  ready: () => {
    $<HTMLButtonElement>("start").disabled = false;
    $("start").innerHTML = "LET’S FLY <span>↗</span>";
  },
});
const bounds = () => {
  const r = $("sky").getBoundingClientRect();
  return r.width >= r.height
    ? { width: Math.round((720 * r.width) / r.height), height: 720 }
    : { width: 720, height: Math.round((720 * r.height) / r.width) };
};
new Phaser.Game({
  type: Phaser.AUTO,
  parent: "sky",
  ...bounds(),
  backgroundColor: "#a9d9c8",
  antialias: true,
  scene: [scene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { smoothStep: false },
  input: { activePointers: 3 },
  audio: { noAudio: true },
  render: { powerPreference: "low-power" },
});
const resize = () => {
  if (!scene.game) return;
  const size = bounds();
  if (size.width === scene.scale.width && size.height === scene.scale.height)
    return;
  if (scene.status === "playing") pause();
  if (scene.world) {
    const w = scene.world,
      sx = size.width / w.width,
      sy = size.height / w.height;
    for (const p of [w.plane, ...w.missiles, ...w.pickups, ...w.warnings]) {
      p.x *= sx;
      p.y *= sy;
    }
    w.width = size.width;
    w.height = size.height;
  }
  scene.scale.setGameSize(size.width, size.height);
};
new ResizeObserver(resize).observe($("sky"));
observeSafeAreas(resize);
$("start").onclick = start;
$("pause").onclick = togglePause;
$("home").onclick = showMenu;
document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(
  (button) =>
    (button.onclick = () => {
      mode = button.dataset.mode as Mode;
      document
        .querySelectorAll("[data-mode]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      updateBest();
      $("description").innerHTML =
        mode === "survival"
          ? "Collect stars. Dodge trouble.<br>Turn a close call into your next high score."
          : mode === "daily"
            ? `One date. One seed. Your best escape.<br>${dailyKey()} UTC · best saved on this device`
            : "Slower missiles. Room to learn.<br>No records, no unlocks, just flying.";
    }),
);
function syncSettings() {
  $("sound").textContent = save.settings.sound ? "SOUND ON" : "SOUND OFF";
  $<HTMLInputElement>("settingSound").checked = save.settings.sound;
  $<HTMLInputElement>("settingHaptics").checked = save.settings.haptics;
  $<HTMLInputElement>("settingMotion").checked = save.settings.reduceMotion;
}
$("sound").onclick = () => {
  save.settings.sound = !save.settings.sound;
  syncSettings();
  persist();
  feedback.wake();
  feedback.play("tap");
};
$("settings").onclick = () => {
  pause();
  syncSettings();
  $<HTMLDialogElement>("settingsDialog").showModal();
};
$("help").onclick = () => {
  pause();
  $<HTMLDialogElement>("helpDialog").showModal();
};
document
  .querySelectorAll<HTMLButtonElement>("[data-close]")
  .forEach(
    (b) => (b.onclick = () => $<HTMLDialogElement>(b.dataset.close!).close()),
  );
(["settingSound", "settingHaptics", "settingMotion"] as const).forEach((id) => {
  $<HTMLInputElement>(id).onchange = () => {
    save.settings = {
      sound: $<HTMLInputElement>("settingSound").checked,
      haptics: $<HTMLInputElement>("settingHaptics").checked,
      reduceMotion: $<HTMLInputElement>("settingMotion").checked,
    };
    syncSettings();
    persist();
    feedback.wake();
  };
});
$("boost").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  e.preventDefault();
  $("boost").setPointerCapture(e.pointerId);
  scene.touchBoost = true;
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((event) =>
  $("boost").addEventListener(event, () => {
    scene.touchBoost = false;
  }),
);
$("expand").onclick = () => {
  $("arena").classList.toggle("fullscreen");
  $("expand").setAttribute(
    "aria-label",
    $("arena").classList.contains("fullscreen")
      ? "Exit expanded game"
      : "Expand game",
  );
  resize();
};
window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
      e.code,
    ) &&
    scene.status === "playing"
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "KeyP" || e.code === "Escape") {
    e.preventDefault();
    togglePause();
  }
  if (
    e.code === "Enter" &&
    scene.status !== "playing" &&
    !$<HTMLButtonElement>("start").disabled
  ) {
    e.preventDefault();
    start();
  }
  if (import.meta.env.DEV && e.code === "F2") {
    e.preventDefault();
    const dev = $("devPanel");
    dev.hidden = !dev.hidden;
  }
});
window.addEventListener("blur", () => pause());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
renderHangar();
syncSettings();
updateBest();
if (import.meta.env.DEV && !new URLSearchParams(location.search).has("shots")) {
  const dev = document.createElement("details");
  dev.id = "devPanel";
  dev.className = "dev-panel";
  dev.hidden = true;
  dev.open = true;
  dev.innerHTML =
    "<summary>FLIGHT LAB · F2 TO HIDE</summary>" +
    Object.entries(DEFAULT_TUNING)
      .map(
        ([key, value]) =>
          `<label>${key}<input data-tune="${key}" type="range" min="${value * 0.5}" max="${value * 1.5}" step="${value > 10 ? 1 : 0.01}" value="${value}"></label>`,
      )
      .join("") +
    '<button id="copyTuning">Copy JSON</button><button id="resetTuning">Reset</button><div class="debug-stats" id="debugStats">Start a flight to see diagnostics.</div>';
  $("arena").append(dev);
  try {
    const saved: unknown = JSON.parse(store.getItem("missiles-tuning") || "{}");
    if (saved && typeof saved === "object")
      for (const key of Object.keys(DEFAULT_TUNING) as (keyof Tuning)[]) {
        const value = (saved as Record<string, unknown>)[key];
        if (
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= DEFAULT_TUNING[key] * 0.5 &&
          value <= DEFAULT_TUNING[key] * 1.5
        )
          scene.tuning[key] = value;
      }
  } catch {}
  document
    .querySelectorAll<HTMLInputElement>("[data-tune]")
    .forEach((input) => {
      const key = input.dataset.tune as keyof Tuning;
      input.value = String(scene.tuning[key] ?? DEFAULT_TUNING[key]);
      input.oninput = () => {
        scene.tuning[key] = Number(input.value);
        if (scene.world) scene.world.tuning[key] = Number(input.value);
        try {
          store.setItem("missiles-tuning", JSON.stringify(scene.tuning));
        } catch {}
      };
    });
  $("copyTuning").onclick = () => {
    void navigator.clipboard
      .writeText(
        JSON.stringify({ ...DEFAULT_TUNING, ...scene.tuning }, null, 2),
      )
      .then(() => toast("Tuning copied"))
      .catch(() => toast("Clipboard unavailable"));
  };
  $("resetTuning").onclick = () => {
    scene.tuning = {};
    if (scene.world) scene.world.tuning = { ...DEFAULT_TUNING };
    document
      .querySelectorAll<HTMLInputElement>("[data-tune]")
      .forEach(
        (i) =>
          (i.value = String(DEFAULT_TUNING[i.dataset.tune as keyof Tuning])),
      );
    try {
      store.setItem("missiles-tuning", "{}");
    } catch {}
  };
  Object.defineProperty(window, "__missiles", {
    value: {
      get world() {
        return scene.world;
      },
      get status() {
        return scene.status;
      },
      get tuning() {
        return scene.tuning;
      },
    },
    configurable: true,
  });
}
