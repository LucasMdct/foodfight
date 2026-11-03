# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This project has **two version tracks**, because it changed identity partway through:

- **POC track (`0.0.0-poc.0.1` → `0.0.0-poc.final.0.8`)** — the technical proof of concept, concluded 2026-08-11. The original milestone suffixes are retained after the `0.0.0-poc` base so the process remains traceable.
- **Game track (from 0.0.1)** — the actual game, starting over at 0.0.1 with the `FoodFight v0.0.1` design. Numbering restarts deliberately; a game release is not a continuation of a POC release.

`Unreleased` contains work after the current game release. The current release is listed immediately below it, followed by the complete historical POC track; its original descriptions and dates are unchanged, while its versions are re-based under `0.0.0-poc.*`.

---

## [Unreleased]

### Added

- Add the v0.0.4 gameplay spec, implementation plan, design handoff, typewriter dialogue controller, and deterministic parity tests.
- Add typewriter Barão dialogue at 65 ms per character with an animated talking mouth while text is being revealed.
- Add animated zombie laughter with an opening/closing mouth and looping `HA HA HA!` pill.
- Add the staged 2,500 ms Barão defeat sequence with inflate/shake/spin animation and nine confetti bursts before the victory modal.
- Add the v0.0.3 difficulty flow with Muito Fácil, Fácil, Difícil, and Impossível presets.
- Add Barão 2.0 gameplay with lane-origin attacks and 100-point zombie bursts.
- Add enlarged Barão/projectile presentation, attack taunts, and difficulty feedback in the HUD.
- Add the v0.0.3 gameplay spec, implementation plan, architecture updates, and deterministic harness coverage.

### Changed

- Redesign the `PODER!` control as a 126 px circular button in the lower-right corner with a rotating gold ring when charged.
- Enlarge the gameplay Barão to the v0.0.4 handoff dimensions of 224 × 242 px and align shot hit (`W - 230`) and explosion (`W - 150`) boundaries.
- Grant v0.0.4 power charges only from collected food bubbles, queued at every 100 points and served one at a time with 84 px bounds and a −90 px despawn boundary.
- Clear every visible sweet and zombie immediately on accepted power fire, award 10 points once per enemy, and request centered confetti while the shot continues toward the Barão.
- Change the screen flow to Loading → Select hero → Choose difficulty → Game → Result.
- Preserve the selected difficulty when replaying a match.
- Lock difficulty speed, spawn interval, and double-spawn chance to each preset for v0.0.4; remove the elapsed-time ramp.
- Set v0.0.4 enemy (12) and effect (8) pool sizes, spawn/despawn boundaries, bubble threshold, Barão bounds, and timing constants from the design handoff.

### Fixed

- Fix power-charge mirroring, zero-charge match starts and soft vertical tracking for power shots.
- Align the combat harness with production for bubble thresholds, hitbox padding, invulnerability, phase-four double spawns and pool saturation.
- Port bubble reflections, zombie laugh pill, typed power-shot visuals, combat HUD markers and the hero victory modal from the v0.0.2 handoff.
- Move combat colours into the shared theme and memoize the Skia canvas away from leaf HUD updates.

- Fixed the select-screen footer to read the current app version from `app.json` instead of displaying the stale `v0.0.1` label.
- Fixed the white flash between the loading burst and the select screen by keeping the themed app surface visible during the transition.
- Fixed the native Expo splash to use the FoodFight asset and cream background instead of the default centered symbol.
- Fixed the loading burst clipping the logo by limiting its scale to a subtle 1.08x transition.

---

## [0.0.2] — 2026-11-02 — _release candidate_

This release packages the v0.0.2 combat loop for device validation. Physical-device performance and manual gameplay QA remain explicitly pending.

### Added

- Added the v0.0.2 combat design handoff and implementation spec, covering the moving Barão Brigadeiro, five attack phases, food bubbles, hero powers, fixed pools, victory/defeat flow and deterministic harness scenarios.
- Added the v0.0.2 combat loop with typed enemy spawns, UI-thread-authorized power shots, capped food bubbles, villain HP, win/over result flow and a headless combat harness.
- Added the complete Barão `bravo` expression from the supplied `Foodie.dc.html` design source.

### Changed

- Updated the gameplay architecture and testing protocol for the v0.0.2 pools, bridges, terminal freeze and device performance gate.
- Imported the complete `Foodie.dc.html` source into `docs/design/project/` and ported its `feliz`/`bravo` expression paths to `Vilao.tsx`.

---

## [0.0.1] — 2026-07-05 — _released game_

This release moved the project from the technical POC into the Food Fight game. It implements the `FoodFight v0.0.1` design and is the release immediately before the v0.0.2 combat work in `Unreleased`.

### Added

- Character selection screen with three heroes — Alface, Feijão, Arroz — each starting with 3 lives.
- Barão Brigadeiro as the villain, throwing candy across the lanes.
- Foodie characters rendered in Skia with an animated walk cycle.
- Spinning candy projectiles (lollipop, gumdrop, donut).
- Scrolling tablecloth background and dashed lane dividers.
- Gameplay screen with an extended engine and a HUD showing lives, score and hero name.
- Game Over modal with score, best score, replay and switch-hero actions.
- Centralized theme (`src/theme`) with design tokens, `ThemeProvider` and UI scaling.
- Fredoka font loading via `@expo-google-fonts/fredoka`.
- Skia animation primitives: swing, bob, spin.
- On-brand app icon and landscape app configuration.
- Husky hooks — lint-staged with Prettier on commit, `tsc` plus lint on push.
- Design spec and implementation plan under `docs/specs/` and `docs/plans/`.
- `CHANGELOG.md` with the backfilled POC and game history.
- `docs/README.md` documentation index.
- `docs/troubleshooting.md` consolidating troubleshooting from three sources.
- Engine math tests (`src/engine/math.test.ts`), `typecheck` and `test` scripts, and a GitHub Actions workflow.

### Changed

- Three-lives state model replaces the POC's health bar.
- Screen flow is now Loading → Select → Game → Game Over.
- Orientation is locked to landscape; the portrait/landscape selection screen is gone.
- Loading screen is themed and on-brand, replacing the POC `GameLoader`.
- Expo bumped to ~56.0.14, `eslint-config-expo` aligned to ~56.0.4.
- Restructured all documentation into a single `docs/` tree with one entry point, removing four duplicated quick-start sections and three duplicated troubleshooting sections.
- Rewrote architecture docs to match the code as it actually is. The previous versions described a `src/systems/` layer, `useGameLoop.ts`, `src/utils/` and separate sprite components that were never built; the real implementation is a single UI-thread worklet in `useRunnerEngine.ts`.
- Unified documentation language to English.
- Reverted the unsupported POC approval. The "30–50 fps" figure was removed in `2c21cd2` without a replacement measurement; the frame rate is now marked **unresolved** and the last recorded figure is kept with provenance.
- Filled in the test-results template with the real ARM device run instead of leaving it blank.
- Moved the design handoff bundle from `design-completo-foodfight-game/` at the repo root to `docs/design/`, updating references in `eslint.config.js`, `src/render/foodie/palette.ts`, and the v0.0.1 spec and plan.
- Recorded in `AGENTS.md` that `docs/design/` is the source of truth for shapes and colours, and that visual changes start there.

### Removed

- POC screens: `GameCanvas`, `GameLoader`, `OrientationScreen`.
- Dead `gameOver` store action, unused `LANE_ORDER`, `TARGET_FPS`, `GAME_CONSTANTS.COLORS`, the duplicate `LANE_COUNT` literal, and the `@utils/*` path alias.
- Tracked `local.properties` (now gitignored and regenerated by prebuild).
- Seven top-level documentation files, moved to `docs/archive/` for reference.

### Fixed

- Corrected the POC verdict back to **unresolved**: the frame-rate criterion has no post-`2c21cd2` measurement, so the last recorded 30–50 fps figure is retained with provenance instead of being treated as approved.
- Added tap-to-change-lane input and scoped gameplay gestures to the canvas so HUD and modal buttons do not move the hero.
- Clamped the frame delta to 50 ms and paused the loop on `AppState` background; resuming no longer teleports candies or awards score.
- Resynced `heroY` and cleared the pool when the viewport height changes.
- Required full screen on iPad and surfaced orientation-lock failures instead of swallowing them.
- Fell back to the system font when Fredoka fails to load instead of hanging on the loading screen.
- Aligned `package.json` and `app.json` to v0.0.1.
- Fixed Foodie arm counter-phase, Alface leg shape, villain timing and palette.
- `SelectScreen` and `GameOverModal` made responsive to viewport height.
- Non-deprecated Skia path API used in `LaneDividers`.
- Android adaptive icon uses a cream background colour instead of a stale background image.

### Known debts

- Per-hero walk-cycle bob offset from the design is not replicated; heroes bob in unison.
- `assets/android-icon-monochrome.png` still uses the old artwork (Android 13+ themed icon only).
- Manual QA on ARM hardware is pending — villain spin, 1.4 s invulnerability flicker, 130 ms lane-change swipe, background scroll scoping, and frame rate are all unverified.

---

## Historical POC track — before game release `v0.0.1`

## [0.0.0-poc.final.0.8] — 2026-08-11 — _POC track_

POC concluded with the frame-rate criterion **unresolved**. The mechanics and the engine architecture were validated; the last recorded run measured 30–50 fps and has not been re-measured.

> Corrected 2026-10-27: this entry previously claimed "approved" without a frame-rate measurement. See `[Unreleased]`.

### Added

- `docs/POC-CONCLUSION.md` with device test results and recommendations.
- Orientation selection screen (`OrientationScreen`) with portrait/landscape lock via `expo-screen-orientation`.

### Verdict

- Four criteria have recorded manual passes: swipe latency, collision accuracy, memory stability, and stability.
- Frame rate: last recorded 30–50 fps against a ≥55 bar; provenance disputed and no re-measurement. The criterion is unresolved — see [docs/results.md](docs/results.md).
- The UI-thread worklet loop with a fixed pool and zero per-frame allocation is validated as an architecture; the performance ceiling is unresolved.

---

## [0.0.0-poc.0.7] — 2026-07-04

### Fixed

- Perceived startup delay: loader animation sped up and the first obstacle now spawns immediately instead of after one full spawn interval.

### Changed

- Extracted inline styles into `App.styles.ts`, `GameCanvas.styles.ts` and `GameLoader.styles.ts`.

---

## [0.0.0-poc.0.6] — 2026-07-04

### Added

- Animated loading screen (`GameLoader`) with portal animation, progress bar and burst transition into the game.

---

## [0.0.0-poc.0.5] — 2026-07-04

### Added

- Score display in the HUD.

### Changed

- Game Over modal redesigned with an integrated "Play Again" button.

---

## [0.0.0-poc.0.4] — 2026-07-04

### Fixed

- Crash when the hero collided with an obstacle.
- Invulnerability window not being respected after a hit.
- Frame timing jitter: the loop now throttles to a ~16 ms threshold.
- Touch input lag on lane changes.
- Score not counting dodged obstacles.

### Added

- ESLint with the Expo flat config and an `npm run lint` script.

---

## [0.0.0-poc.0.3] — 2026-07-04

### Added

- Specs and implementation plans for the Game Over UI and the loading screen (now under `docs/specs/` and `docs/plans/`).

---

## [0.0.0-poc.0.2] — 2026-07-01

### Added

- Initial POC: Skia canvas with three lanes, UI-thread game loop via `useFrameCallback`, fling-based swipe input, fixed-size obstacle pool, AABB collision with hitbox padding, collision flicker feedback, FPS counter, and a Zustand store for discrete state.

---

## [0.0.0-poc.0.1] — 2026-06-27

### Added

- Repository initialised; POC specification drafted (now `docs/specs/poc-runner-skia.md`).
- Preserved superseded POC documents under `docs/archive/` for reference.
