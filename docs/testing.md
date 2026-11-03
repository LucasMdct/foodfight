# Testing Guide

The validation protocol for Food Fight v0.0.4. Pure combat rules, typewriter dialogue, presentation contracts, and race conditions are covered by automated Vitest tests; frame timing and visual fidelity still require a physical device because the question that matters most (render performance on real hardware) cannot be answered any other way.

**Status: automated checks cover v0.0.4; device validation is outstanding.** The POC's frame-rate criterion is **unresolved**: the last recorded run measured 30–50 fps and has not been re-measured ([results.md](./results.md)). Because v0.0.4 draws a 12-slot typed enemy pool, an 8-slot confetti pool, a 224 × 242 Barão, animated mouths, and staged defeat bursts, treat that result as a **baseline, not a prediction**.

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
3. Select screen shows all three heroes — Alface, Feijão, Arroz — and the `v0.0.4` version label.
4. Pick each hero in turn; the correct character appears in-game.
5. Press **CONTINUAR →** and verify the difficulty screen shows all four cards.
6. Choose each difficulty in turn; the selected label appears in the game HUD.
7. From Win or Game Over, use both exits: **play again** and **switch hero**.

| Check         | Expected                                                   |
| ------------- | ---------------------------------------------------------- |
| Fonts         | No fallback-font flash before the loader clears            |
| Orientation   | Landscape, locked, no rotation possible                    |
| Hero identity | HUD name and on-canvas character match the pick            |
| Difficulty    | Four cards are visible, selectable, and labelled correctly |
| Play again    | Restarts at 3 lives, score 0, same selected difficulty     |
| Switch hero   | Returns to select; `best` survives                         |

`GameScreen` stays mounted across `'game'`, `'over'`, and `'win'`, so **replay is the interesting path** — it exercises `engine.reset()` without a remount. Candy left on screen or stale dialogue after restart means the reset was incomplete.

---

## Phase 2 — Baseline (5 min)

**Question:** is the render loop stable with no player input?

1. Enter a match and do not touch the screen.
2. Let the hero take all three hits and reach Game Over.
3. Restart and repeat, letting it run 5 minutes total.

| Record                | Target        |
| --------------------- | ------------- |
| Average FPS           | ≥ 55          |
| Minimum FPS           | ≥ 50          |
| Memory at start / end | growth < 5 MB |
| Crashes               | 0             |

Watch the **tablecloth scroll** specifically: it repaints the full screen every frame and is the largest single draw. Stutter that tracks the scroll loop points there.

A frame rate that _degrades_ over time points at a leak — check the pool is recycling.

---

## Phase 3 — Gameplay (10 min)

**Question:** do the mechanics work, and does input hold up?

### 3.1 Lane changes

- Swipe or tap up from middle → hero moves to top
- Swipe or tap down from middle → hero moves to bottom
- Swipe/tap up while already at top → nothing happens
- Swipe/tap down while already at bottom → nothing happens
- The transition takes roughly 130 ms and reads as smooth
- The control hint disappears after the first successful move, and returns on a new match

### 3.2 Input latency

Target: under 100 ms perceived. Two ways to check:

- **By feel:** swipe rapidly and repeatedly. Any perceptible gap between gesture and movement is a failure. This is a real measurement — 100 ms is roughly the threshold of perception for direct manipulation.
- **Instrumented:** log `Date.now()` in `SwipeHandler.handleSwipe` and again when `heroY` settles, and compare.

Remember the 100 ms debounce in `SwipeHandler`: two flicks inside that window collapse into one by design, and that is not a bug.

### 3.3 Fixed difficulty, Barão movement and candies

- Verify Muito Fácil (215 px/s / 1450 ms), Fácil (300 / 1050), Difícil (430 / 760), and Impossível (560 / 540) match their preset pace.
- The selected difficulty remains strictly fixed during a match; speed and spawn interval do not ramp over time.
- The Barão renders at 224 × 242 px with a purple aura and moves vertically through the lanes.
- Normal attacks leave the Barão's current lane at `W - 210` rather than a random lane.
- At 100, 200, and later score thresholds, the Barão performs the belly attack and launches three staggered zombie projectiles (`160`, `460`, and `760 ms`).
- Zombies wobble, open and close their mouth, and display a looping `HA HA HA!` pill.
- Projectiles disappear past `−120 px` at the left edge and never accumulate off-screen.
- All candies spin in lockstep (one shared phase — this is intended, not a bug).

Watch for a spawn _gap_ — if all 12 enemy slots are busy, that tick is skipped without allocating a new object. Confirm lollipop, candy, donut and zumbi all appear as the score crosses the phase thresholds.

### 3.4 Collisions and lives

- Overlap in the same lane registers a hit
- Passing in a different lane never registers
- Hero flickers for ~1.4 s (four blinks) and cannot be hit again during it
- Each hit costs exactly one life; three hits ends the run
- Dodging a candy adds 10 to the score
- Best score updates only when the run beats it

### 3.5 Powers, milestones, bubbles and staged defeat

- The 126 px circular `PODER!` button sits in the lower-right corner, pulses with a rotating dashed gold ring when charged, fires on press-in, and never moves the hero.
- Double tapping with one charge creates only one shot.
- A shot moves right, hits the Barão at `W - 230` with a confetti burst at `W - 150`, and removes one HP.
- The fifth accepted hit freezes gameplay, starts the 2,500 ms Barão inflate/shake/spin defeat animation with nine confetti bursts around the villain, and opens the victory modal only after the sequence completes.
- A shot never spends a charge when all three shot slots are occupied.
- Every 100 points queues one food bubble and triggers one Barão burst; score alone grants no charge.
- An accepted power immediately clears every visible sweet and zombie, including enemies behind the hero, awards ten points once per enemy, and requests centered confetti.
- Later spawns survive until another accepted fire. A saturated eight-slot confetti pool drops effects without dropping clears or score.
- Food bubbles appear one at a time after each 100-point threshold; collecting one adds a charge but never exceeds three. Check the 84 px bounds and −90 px left-edge despawn boundary.
- A full-charge pickup still shows feedback and does not increase the charge count.
- A late enemy hit cannot replace a staged defeat or frozen win with Game Over.

Test edge cases specifically: clip the leading and trailing edge of a candy. The 18 px hitbox inset means grazes should _not_ count.

### 3.6 Result modals

- Win and Game Over modals show final score and best.
- The scene behind the modal is **frozen** — no scroll, no candy movement.
- FPS sampling continues (visible under `__DEV__`).

### 3.7 Barão dialogue and feedback

- Dialogue reveals one character every 65 ms (typewriter effect) while the Barão's mouth opens and closes.
- Once typing finishes, the mouth stops moving and the bubble holds for 2,800 ms (taunts) or 2,200 ms (ouches).
- An opening taunt starts 800 ms after gameplay begins; a new dialogue line cancels any previous typewriter timer.
- A non-final power hit sets the Barão to `bravo` for 1,400 ms and shakes him for 450 ms.
- The final power hit types `"NÃÃÃO! Meus doces! Isso não fica assim!!"` during the 2,500 ms defeat sequence.
- Power-cleared projectiles and shot impacts show centered confetti using the eight-slot pool (`620 ms` duration).

---

## Phase 4 — Stress (5 min minimum)

**Question:** does anything degrade over a full session?

1. Play continuously through at least three full matches, including Difícil and Impossível.
2. Include at least one match run past two minutes.

| Record                  | Target                       |
| ----------------------- | ---------------------------- |
| Match duration          | ≥ 2 min for at least one run |
| Average FPS during play | ≥ 55                         |
| Minimum FPS             | ≥ 50                         |
| Memory growth           | < 50 MB                      |
| Crashes                 | 0                            |
| Jank / stutter          | none sustained               |

---

## Phase 5 — Profiling (only if a phase failed)

### Android

```bash
adb shell dumpsys meminfo <package>          # memory snapshot
adb shell dumpsys gfxinfo <package>          # frame timing histogram
```

Android Studio → Profiler for CPU/GPU/memory over time.

| Metric         | Target  |
| -------------- | ------- |
| CPU average    | < 80%   |
| GPU average    | < 85%   |
| Dropped frames | 0       |
| GC pauses      | minimal |

### iOS

Xcode → Product → Profile → **Metal System Trace**.

| Metric        | Target    |
| ------------- | --------- |
| GPU average   | < 85%     |
| Frame time    | ~16.67 ms |
| Missed frames | 0         |

### Interpreting it

- **GPU pegged, CPU low** → render path is the bottleneck. The last recorded POC run is consistent with this, but no profiler trace was recorded; confirm it on hardware. Reduce draw calls before anything else; see the levers in [architecture.md](./architecture.md).
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

The automated suite includes `src/engine/combatMath.test.ts`,
`src/engine/combatSimulation.test.ts`, `src/store/gameStore.test.ts`,
`src/features/game/villainDialogue.test.ts`, and `src/features/game/gamePresentation.test.ts`.
These cover fixed difficulty presets, score milestones, seeded distribution, clamped villain
motion, soft shot tracking, UI-thread charge authorization, zero-charge starts,
food pickup caps and padding, 100-point bubble thresholds, invulnerability,
zombie hitboxes, milestone bursts, full-screen power clearing, centered confetti,
typewriter dialogue cadence and cancellation, staged Barão defeat and delayed victory,
phase-four sugar rain, pool saturation, power rotation, reset/replay and terminal result races.

Pre-commit runs lint-staged with Prettier; pre-push runs `tsc` plus lint. GitHub Actions runs typecheck, lint and tests on every PR.

---

## Recording results

Copy this into a new dated file under `docs/` and fill it in:

```markdown
# Test Run — YYYY-MM-DD

**Version:** v0.0.4
**Device:** model, SoC, RAM
**OS:** version
**Build:** release / dev
**Display:** __ Hz
**Constants:** ENEMY_POOL=12 SHOT_POOL=3 BURST_POOL=8
**Frame time:** p50=__ p95=__ p99=__ dropped=__%
**Tester:**

| Criterion          | Target                                        | Measured | Result |
| ------------------ | --------------------------------------------- | -------- | ------ |
| Frame rate         | ≥55 fps                                       |          |        |
| Swipe latency      | <100 ms                                       |          |        |
| Collision accuracy | no false +/-                                  |          |        |
| Lives              | 1 per hit, 3 ends run                         |          |        |
| Fixed difficulty   | constant speed/interval per preset            |          |        |
| Powers             | full-screen clear, five hits stage defeat/win |          |        |
| Food bubbles       | 100-pt threshold, one active, cap three       |          |        |
| Terminal freeze    | staged defeat/win/over ignore late events     |          |        |
| Memory             | <50 MB / 2 min                                |          |        |
| Stability          | 0 crashes                                     |          |        |

**Verdict:** approved / rejected / conditional
**Notes:**
```

Then add a `CHANGELOG.md` entry if the run changes the project's conclusions.

---

## Outstanding for v0.0.4

Carried from the branch's known debts — none of these have been verified on hardware:

- Villain spin and 2,500 ms staged defeat animation before the victory modal
- Typewriter dialogue reveal (65 ms/char) and Barão talking mouth on device
- Zombie mouth animation and looping `HA HA HA!` pill
- 126 px lower-right circular `PODER!` button and rotating dashed gold ring
- 1.4 s invulnerability flicker timing and 130 ms lane-change swipe/tap
- Background scroll confined to the game screen
- Frame rate under the full v0.0.4 scene (12 enemy slots, 8 confetti slots, 224 × 242 Barão)
- Difficulty card layout and all four fixed difficulty presets on a short landscape device
- Bubble-only charging, full-screen power clears including zombies, and centered confetti
- p95 comparison against the v0.0.1 baseline using the platform profiler
