# Testing Guide

The validation protocol for Food Fight v0.0.1. There is no automated test suite — validation is manual and device-based, because the question that matters most (frame rate on real hardware) cannot be answered any other way.

**Status: this protocol has not yet been run against v0.0.1.** The POC's mechanics passed manual validation, but its frame-rate criterion is **unresolved**: the last recorded run measured 30–50 fps and has not been re-measured ([results.md](./results.md)). Because the POC drew a much simpler scene, treat its result as a **baseline, not a prediction**.

---

## Before you start

Frame-rate numbers are only valid under these conditions:

- **Physical device.** Emulators do not reproduce ARM GPU behaviour.
- **Release build.** `npx expo run:android --variant release` or an installed APK. Dev builds carry Metro and instrumentation overhead.
- **Remote JS debugging off.** It alone can halve the frame rate.
- **Airplane mode** for the baseline phase, so background activity does not pollute the measurement.
- **Battery above 30%** and not thermally throttled. Run the device cool.

The FPS readout renders **only under `__DEV__`**, top-left. It is loop-update rate after the 16 ms throttle, not presented frame rate: on a 90 Hz panel it can read ~45 while the device is rendering 90. A release build shows nothing, so read real frame timing from the profiler instead — `adb shell dumpsys gfxinfo` on Android, Metal System Trace on iOS. Record p50/p95/p99 frame time and dropped-frame percentage, not only an average.

Record the device model, OS version, build type, display refresh rate and the `GAME_CONSTANTS` values in use. Numbers without those are not comparable to anything.

---

## Phase 1 — Boot and screen flow (5 min)

**Question:** does the app reach gameplay cleanly?

1. Cold launch. The loading screen holds until Fredoka fonts resolve.
2. Orientation locks to landscape without a flash of portrait.
3. Select screen shows all three heroes — Alface, Feijão, Arroz.
4. Pick each hero in turn; the correct character appears in-game.
5. From Game Over, use both exits: **play again** and **switch hero**.

| Check | Expected |
|---|---|
| Fonts | No fallback-font flash before the loader clears |
| Orientation | Landscape, locked, no rotation possible |
| Hero identity | HUD name and on-canvas character match the pick |
| Play again | Restarts at 3 lives, score 0, starting difficulty |
| Switch hero | Returns to select; `best` survives |

`GameScreen` stays mounted across `'game'` and `'over'`, so **replay is the interesting path** — it exercises `engine.reset()` without a remount. Candy left on screen or difficulty that stays ramped means the reset was incomplete.

---

## Phase 2 — Baseline (5 min)

**Question:** is the render loop stable with no player input?

1. Enter a match and do not touch the screen.
2. Let the hero take all three hits and reach Game Over.
3. Restart and repeat, letting it run 5 minutes total.

| Record | Target |
|---|---|
| Average FPS | ≥ 55 |
| Minimum FPS | ≥ 50 |
| Memory at start / end | growth < 5 MB |
| Crashes | 0 |

Watch the **tablecloth scroll** specifically: it repaints the full screen every frame and is the largest single draw. Stutter that tracks the scroll loop points there.

A frame rate that *degrades* over time points at a leak — check the pool is recycling.

---

## Phase 3 — Gameplay (10 min)

**Question:** do the mechanics work, and does input hold up?

### 3.1 Lane changes

- Swipe up from middle → hero moves to top
- Swipe down from middle → hero moves to bottom
- Swipe up while already at top → nothing happens
- Swipe down while already at bottom → nothing happens
- The transition takes roughly 130 ms and reads as smooth
- The control hint disappears after the first successful move, and returns on a new match

### 3.2 Input latency

Target: under 100 ms perceived. Two ways to check:

- **By feel:** swipe rapidly and repeatedly. Any perceptible gap between gesture and movement is a failure. This is a real measurement — 100 ms is roughly the threshold of perception for direct manipulation.
- **Instrumented:** log `Date.now()` in `SwipeHandler.handleSwipe` and again when `heroY` settles, and compare.

Remember the 100 ms debounce in `SwipeHandler`: two flicks inside that window collapse into one by design, and that is not a bug.

### 3.3 Candies and difficulty ramp

- Spawn from the right edge and travel left at constant speed
- Disappear at the left edge; never accumulate off-screen
- All three types appear — lollipop, gumdrop, donut
- All candies spin in lockstep (one shared phase — this is intended, not a bug)
- **Over a long run, candies visibly speed up and spawn more often**

The ramp is the newest mechanic and the least exercised. Play a single match past two minutes and confirm speed approaches its 600 px/s ceiling and the interval approaches its 420 ms floor without the pool starving.

Watch for a spawn *gap* — if all 8 pool slots are busy, that tick is silently skipped. The tightening interval narrows that margin as a match progresses.

### 3.4 Collisions and lives

- Overlap in the same lane registers a hit
- Passing in a different lane never registers
- Hero flickers for ~1.4 s (four blinks) and cannot be hit again during it
- Each hit costs exactly one life; three hits ends the run
- Dodging a candy adds 10 to the score
- Best score updates only when the run beats it

Test edge cases specifically: clip the leading and trailing edge of a candy. The 18 px hitbox inset means grazes should *not* count.

### 3.5 Game Over

- Modal shows final score and best
- The scene behind it is **frozen** — no scroll, no candy movement
- FPS sampling continues (visible under `__DEV__`)

---

## Phase 4 — Stress (5 min minimum)

**Question:** does anything degrade over a full session?

1. Play continuously through at least three full matches.
2. Include at least one match run past two minutes so the ramp reaches its limits.

| Record | Target |
|---|---|
| Match duration | ≥ 2 min for at least one run |
| Average FPS during play | ≥ 55 |
| Minimum FPS | ≥ 50 |
| Memory growth | < 50 MB |
| Crashes | 0 |
| Jank / stutter | none sustained |

---

## Phase 5 — Profiling (only if a phase failed)

### Android

```bash
adb shell dumpsys meminfo <package>          # memory snapshot
adb shell dumpsys gfxinfo <package>          # frame timing histogram
```

Android Studio → Profiler for CPU/GPU/memory over time.

| Metric | Target |
|---|---|
| CPU average | < 80% |
| GPU average | < 85% |
| Dropped frames | 0 |
| GC pauses | minimal |

### iOS

Xcode → Product → Profile → **Metal System Trace**.

| Metric | Target |
|---|---|
| GPU average | < 85% |
| Frame time | ~16.67 ms |
| Missed frames | 0 |

### Interpreting it

- **GPU pegged, CPU low** → render path is the bottleneck. The last recorded POC run is consistent with this, but no profiler trace was recorded; confirm it on v0.0.1. Reduce draw calls before anything else; see the levers in [architecture.md](./architecture.md).
- **CPU pegged** → look at the worklet. It should be trivially cheap; if it is not, something React-side is running per frame.
- **Sawtooth memory** → allocation in the loop. The pool exists to prevent this.

---

## Static checks

Husky runs these automatically, but run them by hand before a long QA session:

```bash
npm run lint
npm run typecheck
npm test
```

Pre-commit runs lint-staged with Prettier; pre-push runs `tsc` plus lint. GitHub Actions runs typecheck, lint and tests on every PR.

---

## Recording results

Copy this into a new dated file under `docs/` and fill it in:

```markdown
# Test Run — YYYY-MM-DD

**Version:** v0.0.1
**Device:** model, SoC, RAM
**OS:** version
**Build:** release / dev
**Display:** __ Hz
**Constants:** POOL=__ BASE_SPEED=__ SPAWN=__
**Frame time:** p50=__ p95=__ p99=__ dropped=__%
**Tester:**

| Criterion | Target | Measured | Result |
|---|---|---|---|
| Frame rate | ≥55 fps | | |
| Swipe latency | <100 ms | | |
| Collision accuracy | no false +/- | | |
| Lives | 1 per hit, 3 ends run | | |
| Difficulty ramp | speeds up, no pool starvation | | |
| Memory | <50 MB / 2 min | | |
| Stability | 0 crashes | | |

**Verdict:** approved / rejected / conditional
**Notes:**
```

Then add a `CHANGELOG.md` entry if the run changes the project's conclusions.

---

## Outstanding for v0.0.1

Carried from the branch's known debts — none of these have been verified on hardware:

- Villain spin animation
- 1.4 s invulnerability flicker timing
- 130 ms lane-change swipe
- Background scroll confined to the game screen
- Frame rate under the full v0.0.1 scene
