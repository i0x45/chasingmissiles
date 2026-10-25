# Missiles: implementation decisions

- Q1: This iteration is a local playable browser game and mobile-feel prototype. Native store delivery, accounts, monetization, deployment and legal pages are later phases, not implied by improving gameplay.
- F1: Phaser 3 renders only. Pure strict TypeScript in packages/shared owns simulation, collisions, scoring and seeded spawning. No Phaser physics plugin.
- F2: 120 Hz fixed simulation, capped catch-up, integer steering inputs, seeded RNG. Same seed, arena, tuning and inputs reproduce a run. Logical short side is 720; longer side expands with aspect.
- F3: Auto-forward flight, keyboard left/right, dynamic drag joystick on touch, hold boost. Edges wrap; the menu explains this. Touch targets are at least 44 px.
- F4: Incoming missiles telegraph for one second. Limited steering, lifetime and delayed collision arming give fair escape opportunities. Close-call bonuses require leaving the danger radius alive, once per missile.
- F5: Survival ramps slowly; daily uses a date-derived seed; practice is slower and non-scoring. All three work without a network. Daily comparisons apply only to matching arena/configuration; there is no online leaderboard.
- C1: Endless arena; no discrete levels or level editor/solver is needed. Tests verify deterministic generation and core rules instead.
- C2: Three cosmetic planes unlock from lifetime collected stars; all have identical physics. Per-flight missions teach the loop. No purchases or ads.
- S1: Versioned zod save catches invalid fields independently, migrates the previous best score, and tolerates unavailable storage. No personal data leaves the browser.
- A1: Local bundled OFL fonts and generated vector geometry; audio uses local Web Audio synthesis. No API keys or remote media are needed.
- N1: Android/iOS shells and haptics adapters are deferred until real-phone feel approval. Browser vibration respects settings and platform support.
- W1: The user explicitly authorized committing and pushing to https://github.com/i0x45/chasingmissiles.git. Push source to that repository. Sites deployment is separate and remains deferred. Keep local hosting identity out of the GitHub source repository.
