# Missiles — Sky Run handoff

## Current state

Playable browser game, upgraded from a dependency-free sketch to a pnpm/Turborepo workspace with Phaser rendering, a pure TypeScript simulation, validated saves, and bundled fonts. The user requested the `mobile-game-dev` skill and then explicitly asked to commit the code to `i0x45/chasingmissiles`.

## Phase status

| Phase                           | Status                                                                                                   | Commit  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------- |
| Game scaffold + tooling         | Complete for this local iteration; landing/backend/infrastructure deferred                               | 9e75325 |
| Core feel + tuning              | Implemented; real-phone feel approval pending                                                            | 9e75325 |
| Core loop                       | Playable start → fly → crash → results → retry                                                           | 9e75325 |
| Content                         | Endless arcade arena; discrete levels/editor/solver not applicable                                       | —       |
| Progression                     | Three cosmetic planes, lifetime stars, per-flight goals, saved records                                   | 9e75325 |
| Endless generation              | Small seeded spawn scheduler runs synchronously inside deterministic simulation                          | 9e75325 |
| Presentation                    | Original vector planes, trails, clouds, telegraphs, particles, synthesized effects, reduce-motion option | 9e75325 |
| Backend / ads / native / stores | Deferred; no accounts, network scoring, ads, purchases or native releases                                | —       |

## Key files and commands

See `README.md` for the file map and controls. `packages/shared/src/engine.ts` is the source of truth for rules, spawning, steering, collision and score. `apps/game/src/FlightScene.ts` only renders and reads input. `main.ts` owns the DOM UI and save lifecycle.

```sh
pnpm install
pnpm dev:game
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Vite serves http://127.0.0.1:4173. For phone testing, run the LAN command in README instead. Production files build to root `dist/`; use `node serve.cjs` with Vite stopped to preview them.

## Validation

- Strict typecheck and type-aware ESLint pass.
- 16 Vitest tests cover seeded replay, hash/RNG invariants, frame-rate-independent clocks, spawn warnings, wrapping, boost, shields, crashes, close-call scoring, missile collisions, star collection and save recovery/migration.
- Production Vite build passes. Phaser is a separate vendor chunk (~319 kB gzip); this is an expected size warning, not a build failure.
- In-app browser checked takeoff, steering, boost, pause and a phone-sized viewport. Real multitouch hardware, native haptics, prolonged performance and store builds remain unverified.

## Pending from the user

Try the controls on a real phone and approve or adjust the feel before native release work. No store credentials, upload keys or support email are needed for the current local game.

## Gotchas

- Use `F2` in development for Flight Lab. Its tuning persists separately in localStorage; reset it before comparing daily runs. `?shots` hides dev UI. Production builds strip the debug handle and panel.
- Daily uses a UTC date seed; arena dimensions and tuning also affect the run. No online or cross-device leaderboard is claimed.
- Resizing/orientation changes pause an active flight and rescale entity positions to fit the new arena.
- Sound defaults off. Browser haptics may be unsupported. Loaded assets allow offline play, but no service worker/PWA install flow is implemented.
- Practice does not update records or cosmetic progression. Cosmetic planes share handling.
- Save schema version 2 repairs fields separately and imports `sky-run-best` from the original prototype.
- `.openai/hosting.json` is retained locally and ignored in GitHub. No Sites deployment was completed. The user authorized this GitHub push; deployment still needs an explicit request under the game skill.
- On this Windows host, Git's Schannel backend failed to acquire credentials. This checkout uses OpenSSL with certificate verification still enabled.
- No force pushes or overwriting existing remote history are needed: the target repository was empty when inspected.

## Repository synchronization

All 24 source files were committed to GitHub main through the signed-in browser after the Windows credential manager and the connected integration denied Git writes. The uploaded tree was verified byte-for-byte against the tested local tree. Local main tracks origin/main; the original local commits are preserved on local-prototype-backup. The table above records the complete game-source commit before this handoff update.
