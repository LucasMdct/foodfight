# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The project has two eras:

- **Historical POC track:** the technical proof of concept and its documentation, grouped before the game release below.
- **Game track:** the current Food Fight product, released as `v0.0.1` after the POC era. Version numbering deliberately restarted when the project became the game.

The POC entries retain their original milestone dates. They are grouped before the current game release because they describe the predecessor project, not a later game release.

---

## [Unreleased]

Work after the current `v0.0.1` release.

### Added

- Added the v0.0.2 combat design handoff and implementation spec, covering the moving Barão Brigadeiro, five attack phases, food bubbles, hero powers, fixed pools, victory/defeat flow and deterministic harness scenarios.
- Added the v0.0.2 combat loop with typed enemy spawns, UI-thread-authorized power shots, capped food bubbles, villain HP, win/over result flow and a headless combat harness.
- Added the complete Barão `bravo` expression from the supplied `Foodie.dc.html` design source.

### Changed

- Updated the gameplay architecture and testing protocol for the v0.0.2 pools, bridges, terminal freeze and device performance gate.
- Imported the complete `Foodie.dc.html` source into `docs/design/project/` and ported its `feliz`/`bravo` expression paths to `Vilao.tsx`.

---

## Historical POC track — before game release `v0.0.1`

### [1.0.0] — 2026-08-11 — _POC conclusion_

POC concluded with the frame-rate criterion **unresolved**. The mechanics and the engine architecture were validated; the last recorded run measured 30–50 fps and has not been re-measured. The current evidence is maintained in [docs/results.md](docs/results.md).

### Added

- Added the POC test results and recommendations to the historical documentation set.
- Added the original orientation-selection flow with portrait/landscape locking via `expo-screen-orientation`.

### Verdict

- Four criteria have recorded manual passes: swipe latency, collision accuracy, memory stability and stability.
- Frame rate: last recorded 30–50 fps against a ≥55 bar; provenance disputed and no re-measurement. The criterion remains unresolved — see [docs/results.md](docs/results.md).
- The UI-thread worklet loop with a fixed pool and zero per-frame allocation is validated as an architecture; the performance ceiling is unresolved.

### [0.5.1] — 2026-07-04

#### Fixed

- Fixed perceived startup delay: the loader now reaches the first obstacle without waiting one full spawn interval.

#### Changed

- Extracted inline styles into the POC screen style modules.

### [0.5.0] — 2026-07-04

#### Added

- Added the animated POC loading screen with portal animation, progress bar and burst transition.

### [0.4.0] — 2026-07-04

#### Added

- Added the POC score display.

#### Changed

- Redesigned the POC Game Over modal with an integrated Play Again button.

### [0.3.0] — 2026-07-04

#### Fixed

- Fixed the crash when the hero collided with an obstacle.
- Fixed invulnerability timing after a hit.
- Reduced frame-timing jitter with a roughly 16 ms loop threshold.
- Reduced touch input lag on lane changes.
- Fixed score counting for dodged obstacles.

#### Added

- Added ESLint and the POC lint script.

### [0.2.0] — 2026-07-04

#### Added

- Added the POC specs and implementation plans for the Game Over UI and loading screen.

### [0.1.0] — 2026-07-01

#### Added

- Added the initial Skia POC: three lanes, UI-thread `useFrameCallback` loop, fling input, fixed obstacle pool, AABB collision, hitbox padding, flicker feedback, FPS counter and Zustand discrete state.

### [0.0.1] — 2026-06-27

#### Added

- Initialised the repository and drafted the POC specification, now preserved at [docs/specs/poc-runner-skia.md](docs/specs/poc-runner-skia.md).
- Preserved superseded POC documents under [docs/archive/](docs/archive/).

---

## [0.0.1] — 2026-07-05 — _current game release_

The project stops being a POC and becomes the game, implementing the `FoodFight v0.0.1` design in full.

### Added

- Added character selection with Alface, Feijão and Arroz, each starting with 3 lives.
- Added Barão Brigadeiro as the villain throwing candy across the lanes.
- Added Foodie characters rendered in Skia with an animated walk cycle.
- Added spinning candy projectiles: lollipop, gumdrop and donut.
- Added the scrolling tablecloth, dashed lane dividers, gameplay screen and HUD with lives, score and hero name.
- Added the Game Over modal with score, best score, replay and switch-hero actions.
- Added centralized theme tokens, `ThemeProvider` and responsive UI scaling.
- Added Fredoka font loading via `@expo-google-fonts/fredoka`.
- Added Skia animation primitives: swing, bob and spin.
- Added the on-brand app icon and landscape app configuration.
- Added Husky hooks with lint-staged, Prettier, `tsc` and lint checks.
- Added the v0.0.1 design spec and implementation plan under `docs/specs/` and `docs/plans/`.
- Added the documentation index and rewritten architecture/testing/troubleshooting docs to describe the game code instead of the archived POC systems.

### Changed

- Replaced the POC health-bar model with three hero lives.
- Changed the screen flow to Loading → Select → Game → Game Over.
- Locked orientation to landscape; the portrait/landscape selection screen is no longer part of the game.
- Replaced the POC loader with the themed loading screen.
- Bumped Expo to `~56.0.14` and aligned `eslint-config-expo` to `~56.0.4`.
- Moved the active design handoff bundle under `docs/design/`; obsolete documents remain under `docs/archive/`.

### Removed

- Removed the POC screens `GameCanvas`, `GameLoader` and `OrientationScreen`.
- Removed obsolete POC-only systems documentation from the active documentation path.

### Fixed

- Fixed Foodie arm counter-phase, Alface leg shape, villain timing and palette.
- Made `SelectScreen` and `GameOverModal` responsive to viewport height.
- Replaced the deprecated Skia path API in `LaneDividers`.
- Updated the Android adaptive icon to use the cream background instead of stale artwork.

### Known debts

- Per-hero walk-cycle bob offset from the design is not replicated; heroes bob in unison.
- `assets/android-icon-monochrome.png` still uses the old artwork for Android 13+ themed icons.
- Manual ARM-device QA is pending for the v0.0.1 baseline and remains the performance baseline for v0.0.2.
