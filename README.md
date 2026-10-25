# Missiles — Sky Run

A small plane, an open sky, and a growing swarm of homing missiles. Collect stars, escape close passes for combo bonuses, and lure missiles into each other.

## Run locally

Use Node.js 22.12+ (Node 24 recommended) and pnpm 11.25.0. From the repository root:

```sh
pnpm install
pnpm dev:game
```

Open http://127.0.0.1:4173. For a phone on the same trusted Wi-Fi network:

```sh
pnpm --filter @missiles/game exec vite --host 0.0.0.0 --port 4173
```

Open the printed Network URL on the phone. A firewall may require allowing local development traffic.

## Play

- **Left / right arrows or A / D:** steer. The plane flies forward automatically.
- **Touch / mouse drag:** drag from the point you press toward the direction you want to fly.
- **Space / BOOST:** hold to accelerate; release to recharge.
- **P / Escape:** pause or resume. Enter starts or retries a flight.
- Edges wrap to the opposite side. Orange warnings telegraph incoming missiles.
- Collect stars for points and cosmetic plane unlocks. Shields absorb one hit for up to ten seconds.
- Escape close passes to build a temporary score multiplier, up to ×5. Missile collisions earn bonus points.

**Survival** ramps difficulty. **Daily Flight** repeats a date-derived UTC seed and saves a separate daily best on this device. Course layout also depends on arena dimensions; this is not an online competition. **Practice** has slower missiles and does not change records or unlocks.

Progress and settings stay in localStorage. No account, server, ad SDK, or purchase is needed. The game keeps playing without network access after its assets have loaded; this revision is not an installable offline PWA.

## Checks and build

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The production static build is written to `dist/`. To preview it:

```sh
node serve.cjs
```

Stop the development server first; both use port 4173. `dist/` and dependencies are generated and not committed.

## Code map

| Location                        | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `apps/game/src/FlightScene.ts`  | Phaser rendering and input; no engine physics plugin |
| `apps/game/src/main.ts`         | Menus, HUD, mode selection, progression and settings |
| `apps/game/src/platform.ts`     | Audio, browser haptics and safe-area observation     |
| `packages/shared/src/engine.ts` | Pure deterministic 120 Hz simulation and scoring     |
| `packages/shared/src/save.ts`   | Versioned, validated saves and migration             |
| `packages/shared/tests`         | Simulation, collision, clock and save tests          |
| `DECISIONS.md`                  | Chosen defaults and scope                            |
| `HANDOFF.md`                    | Verified state, phase status and remaining work      |

In development, **F2** opens a live Flight Lab with speed, steering, missile and spawn tuning. Its values stay on the device. Reset tuning before comparing Daily Flight runs. Debug UI and `window.__missiles` are excluded from production builds; `?shots` hides the panel in development captures.

The client uses Phaser 3.90, Vite 8 and strict TypeScript. Shared logic uses zod, with Vitest tests; pnpm and Turborepo manage the workspace. Fonts are bundled locally from Fontsource (DM Sans and Barlow Condensed, OFL). Plane artwork is generated from geometry and sound effects are synthesized locally.

This is a browser game and mobile-feel prototype. Android/iOS shells, real-device feel approval, leaderboards and store releases are future phases.
