# Food Fight

A mobile endless runner built with **Expo SDK 56**, **React Native Skia** and **Reanimated**.

**Version:** 0.0.2 ([changelog](./CHANGELOG.md))
**Status:** v0.0.2 implemented — release candidate available, hardware QA pending

Pick a Foodie, dodge the candy the Barão Brigadeiro throws across three lanes of a rolling kitchen table, and keep your three lives.

---

## Where the project stands

The repository has been through two phases. Both phases are implemented; the POC verdict is unresolved and the game is unverified on hardware.

### Phase 1 — Technical POC · **run 2026-07-04; verdict unresolved**

One question: *can React Native Skia hold the gameplay loop at an acceptable frame rate on a mid-range device, before we invest in a full game?*

**Answer: unresolved.** The last recorded run on `master` measured **30–50 fps** against a ≥55 fps bar on a physical ARM handset. Commit `2c21cd2` removed that figure without a new measurement, so it stays here as the last recorded result, not as proof. The other four criteria passed under manual observation:

| Criterion | Target | Measured | Result |
|---|---|---|---|
| Frame rate | ≥ 55 fps | 30–50 fps (last recorded; not re-measured) | ⏳ |
| Swipe latency | < 100 ms | no perceptible lag | ✅ |
| Collision accuracy | no false positives/negatives | accurate | ✅ |
| Memory | stable over 2+ min | flat, no leaks | ✅ |
| Stability | zero crashes | zero after fixes | ✅ |

The architecture is still the strongest part: the loop runs entirely on the UI thread with zero per-frame allocation, so React is never in the frame path and GC never interrupts a frame. Those are invariants now, not incidental details.

**No engine change is justified yet.** The mechanics and the engine invariants are validated; the frame-rate criterion is not. v0.0.1 draws considerably more than the POC, so the next decision depends on a fresh measurement, not on the old number. Full analysis in [docs/results.md](./docs/results.md).

> The 30–50 fps figure is disputed in this branch: commit `2c21cd2` claimed it came from an old README and removed it. No replacement measurement exists, so the figure is retained as the last recorded result and the verdict is marked unresolved rather than approved.

### Phase 2 — Game v0.0.1 · **released, QA pending**

From v0.0.1 the project stops being a POC and becomes the game, implementing the `FoodFight v0.0.1` design in full.

**Delivered:** character selection with three heroes, the Barão Brigadeiro villain, Skia-rendered characters with an animated walk cycle, spinning candy projectiles, scrolling tablecloth and lane dividers, a three-lives model, HUD, Game Over with best-score tracking, a centralized theme with Fredoka typography, and Husky quality gates.

**Replaced:** every POC screen. `GameCanvas`, `GameLoader` and `OrientationScreen` are gone; orientation is locked to landscape rather than chosen.

**Kept:** the engine. The UI-thread worklet in `useRunnerEngine.ts` still drives gameplay — extended with a difficulty ramp, a shared candy spin phase and background scroll, but structurally the POC's design. That is the POC's lasting return.

**Not proven:** v0.0.1 has **never been measured on a device.** No hardware or emulator was available when the work was done. The scene now draws considerably more than the POC did — character geometry, a full-screen scrolling background, lane dividers, a floating villain — so the POC's result **does not transfer automatically**. The protocol to close this is in [docs/testing.md](./docs/testing.md).

---

## The game

| | |
|---|---|
| **Heroes** | Alface, Feijão, Arroz — pick one, each starts with 3 lives |
| **Villain** | Barão Brigadeiro, throwing candy from the far side of the table |
| **Projectiles** | Lollipop, gumdrop, donut — falling across 3 lanes |
| **Input** | Swipe or tap up/down to change lane |
| **Scoring** | Points for dodging; best score persists across runs in a session (not across cold starts) |
| **Loss** | Losing all 3 lives ends the run |
| **Screens** | Loading → Select → Game → Game Over (play again or switch hero) |
| **Orientation** | Landscape, locked |

---

## Quick start

Requires Node 20+, and Xcode or Android Studio for native builds.

```bash
npm install
npm run android   # physical device recommended
npm run ios
npm run web       # renders, but NOT valid for perf measurement
```

`npm run lint` runs ESLint, `npm run typecheck` runs `tsc --noEmit`, and `npm test` runs the engine math tests. Husky runs lint-staged with Prettier on commit, and `tsc` plus lint on push; GitHub Actions repeats typecheck, lint and tests on every PR.

> Frame-rate numbers are only meaningful on a **physical device with a release build** and the remote JS debugger disabled. Emulators and Metro dev builds are not representative.

---

## Project layout

```
App.tsx                       Font loading, landscape lock, screen flow
src/
├── app/
│   └── appStyles.ts          Application shell styles
├── features/
│   ├── loading/              Loading feature + local styles
│   ├── select/               Character selection feature + local styles
│   ├── game/                 Skia scene, HUD and gameplay feature
│   └── game-over/            Score, best, replay / switch hero
├── render/
│   ├── foodie/               Hero and villain characters, walk cycle, palette
│   ├── candies/              Projectile rendering
│   ├── scenario/             Tablecloth scroll, lane dividers
│   └── anim.ts               Skia animation primitives (swing, bob, spin)
├── hud/                      Lives, score, hero name
├── theme/                    Design tokens, ThemeProvider, UI scaling
├── engine/
│   └── math.ts               Pure lane/collision/difficulty math (tested)
├── hooks/
│   └── useRunnerEngine.ts    Game loop (UI-thread worklet)
├── components/
│   └── SwipeHandler.tsx      Fling and tap gestures → lane changes
├── store/gameStore.ts        Zustand: screen flow, lives, score, best
└── types/                    Game types and tunable constants
```

Design rationale for the engine: [docs/architecture.md](./docs/architecture.md).

---

## Documentation

Everything lives in [`docs/`](./docs/README.md). Start there.

| Document | Use it for |
|---|---|
| [docs/README.md](./docs/README.md) | Documentation index |
| [docs/architecture.md](./docs/architecture.md) | How the game works and why |
| [docs/testing.md](./docs/testing.md) | Validation protocol |
| [docs/troubleshooting.md](./docs/troubleshooting.md) | When something breaks |
| [docs/design/](./docs/design/) | Design handoff bundle — source of truth for shapes and colours |
| [docs/results.md](./docs/results.md) | POC measurements and findings (historical) |
| [docs/specs/2026-07-05-foodfight-v001-design.md](./docs/specs/2026-07-05-foodfight-v001-design.md) | v0.0.1 design spec |
| [docs/plans/2026-07-05-foodfight-v001.md](./docs/plans/2026-07-05-foodfight-v001.md) | v0.0.1 implementation plan |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

---

## Known debts

- **POC frame rate unresolved and v0.0.1 unmeasured.** The last recorded POC run was 30–50 fps; v0.0.1 has never been measured on hardware.
- **Best score is in-memory only.** It survives a new match but not a cold start.
- A candy that hits the hero still scores when it exits.
- Collision uses the destination lane during the 130 ms lane transition.
- Walk-cycle **bob offset between heroes** is not replicated — the design's per-hero `animation-delay` is missing, so heroes bob in unison.
- `assets/android-icon-monochrome.png` still carries the old artwork. Affects only the themed icon on Android 13+.
- **Manual QA on ARM hardware is pending.** Unverified: tap input, background/resume behaviour, iPad orientation, villain spin, 1.4 s invulnerability flicker, 130 ms lane-change swipe, background scroll confined to the game screen, and frame rate.

---

## License

MIT — see [LICENSE](./LICENSE).
