# Architecture

How Food Fight is built, and why it is built this way.

**Scope:** this describes the code as it exists on `feature/v001`. It covers the v0.0.1 game. The POC that preceded it is documented in [results.md](./results.md).

---

## The central constraint

A 60 fps target gives a **16.67 ms budget per frame**. In React Native, the JS thread is the wrong place to spend that budget: every `setState` schedules a React render, reconciliation, and a bridge hop. At 60 fps that is 60 render passes per second for values that change continuously.

The whole architecture follows from avoiding that:

> **Per-frame values never touch React.** They live in Reanimated shared values, are mutated by a worklet on the UI thread, and are read directly by Skia. React only hears about discrete events — a hit, a score change, one loop-rate sample per second, a screen transition.

Everything below is a consequence of this rule. It carried over from the POC unchanged, and it is the one part of the codebase that should not be casually refactored.

---

## Layers

```
App.tsx  ─ font loading, landscape lock, loading gate
   │
   ├─ ThemeProvider              design tokens + UI scaling
   └─ Flow
        ├─ features/loading      until fonts are ready
        ├─ features/select       screen === 'select'
        └─ features/game         screen === 'game' | 'over'
             │
             ├─ useRunnerEngine(width, height)   ← all gameplay lives here
             │     └─ useFrameCallback worklet (UI thread)
             │           ├─ loop-rate sampling
             │           ├─ tablecloth scroll
             │           ├─ difficulty ramp
             │           ├─ candy spawn
             │           ├─ candy movement + recycling
             │           ├─ AABB collision
             │           └─ invulnerability flicker
             │
             ├─ SwipeHandler      Fling/tap gestures → engine.moveLane()
             ├─ Canvas            Skia scene: tablecloth, lanes, villain, candies, hero
             ├─ Hud               lives, score, hero name, exit, control hint
             └─ features/game-over screen === 'over'
                      │
                      └─ useGameStore (Zustand)  discrete state only
```

**Data flow is one-directional per thread:**

- UI thread: worklet writes shared values → Skia reads them → pixels. No React involved.
- JS thread: worklet calls `runOnJS` on discrete events → Zustand updates → HUD re-renders.

---

## Screen flow — `App.tsx` and `gameStore`

```
LoadingScreen ──fonts loaded + intro done──▶ SelectScreen
SelectScreen  ──pick(who) + start()───────▶ GameScreen (screen: 'game')
GameScreen    ──lives reach 0────────────▶ GameOverModal (screen: 'over')
                                            ├─ play again → screen: 'game'
                                            └─ switch hero → screen: 'select'
```

`GameScreen` renders for **both** `'game'` and `'over'` — the modal draws on top of a frozen scene rather than replacing it. That means "play again" re-enters `'game'` without a remount, and the engine's shared values survive. `GameScreen` therefore calls `engine.reset()` in an effect keyed on `screen === 'game'`, which covers the first mount and every restart through one code path.

Orientation is locked to landscape once, in `App.tsx`. There is no orientation selection screen — that was a POC artifact.

---

## The engine — `src/hooks/useRunnerEngine.ts`

One hook holds the entire game loop. There is no `systems/` directory: splitting the loop into modules would mean crossing the worklet boundary or allocating per frame.

### Shared values

Created once with `makeMutable` and memoised so they survive re-renders:

| Value | Purpose |
|---|---|
| `heroLane` | 0, 1, 2 — current lane index |
| `heroY` | Animated top-Y of the hero |
| `heroOpacity` | Drives the invulnerability flicker |
| `invulnUntil` | Game-clock timestamp when invulnerability ends |
| `elapsedTime` | Monotonic game clock, survives re-renders |
| `lastUpdateTime` | Frame timestamp of the last accepted update |
| `scrollX` | Tablecloth scroll offset, 0 to −88 |
| `candySpin` | One shared spin phase for every candy |
| `obstacleX[]`, `obstacleY[]`, `obstacleLane[]`, `obstacleActive[]` | Per-slot candy state |
| `spawnAccum`, `fpsAccum`, `fpsFrames` | Accumulators |
| `gameOver` | 1 freezes the simulation |

### The candy pool

`OBSTACLE_MAX_ACTIVE` (8) is a **pool size, not a cap**. Eight candy `<Group>`s are mounted once by `GameScreen` and never unmounted. Spawning means finding a slot with `obstacleActive === 0` and setting its position; despawning means setting it back to 0.

`obstacleActive` doubles as the group's `opacity`, so hiding is free — no conditional rendering, no key churn, no React reconciliation.

**Candy type is not tracked by the engine.** Slot `i` is always `['lolli','candy','donut'][i % 3]`, so `GameScreen` derives it from the index. Carrying it as state would cost a shared value or a re-render to communicate a constant.

**All candies share one spin animation.** `candySpin` is a single `useSpin(900)` phase passed to every slot, rather than eight independent `withRepeat` animations. Visually they rotate in lockstep, which matches the mockup.

**Consequence:** zero allocation per frame, and therefore no GC pressure from the loop. This is what kept memory flat through the POC's stress testing.

**Trade-off:** if all 8 slots are busy, a spawn tick is silently skipped. The difficulty ramp shortens the spawn interval over time, which narrows the margin — worth re-checking if the ramp constants change.

### The frame loop

```
useFrameCallback(frame):
  1. bootstrap lastUpdateTime on the first frame
  2. elapsed = frame.timestamp - lastUpdateTime
  3. if elapsed < 16.0ms → return          ← throttle
  4. advance elapsedTime by the real delta
  5. loop rate: count updates, emit one sample per second via runOnJS
  6. if gameOver → return                   ← freezes everything below
  7. tablecloth scroll: 88px loop every 900ms
  8. difficulty ramp: derive current speed and spawn interval from elapsed time
  9. spawn: on interval, activate one idle slot in a random lane
 10. for each active candy:
       move left by speed * dt
       off-screen? → deactivate, +10 score
       same lane as hero and not invulnerable? → AABB test on X
 11. flicker: derive heroOpacity from time remaining on invulnUntil
```

Details worth knowing before touching this:

**The 16.0 ms throttle (step 3).** `useFrameCallback` fires at the display refresh rate, which is 90 Hz or 120 Hz on many devices. The throttle caps the simulation update cadence at roughly 60 per second; it does not change gameplay speed because movement uses the real measured delta. On a 90 Hz panel it accepts every other frame (~45 updates/s); on a 120 Hz panel it caps at 60. The in-app `fps` value is therefore **loop-update rate**, not presented frame rate — use the platform profiler for real frame timing.

**Frame delta and app state (steps 2–3).** The measured delta is clamped to `MAX_FRAME_DELTA_MS` (50 ms). Without that clamp, returning from the background produces one huge delta: candies teleport off-screen, each scores, and the field clears. The loop also freezes while `AppState` is not `active`, and resets `lastUpdateTime` on resume so the first frame re-bootstraps instead of integrating the pause.

**The game-over gate (step 6) freezes the scene, not just gameplay.** Scroll and spawn both sit below it, so the Game Over modal draws over a still tablecloth. Loop-rate sampling sits above it and keeps running.

**The difficulty ramp (step 8)** is derived from `elapsedTime` every frame rather than stored:

```
speed    = CANDY_BASE_SPEED + min(CANDY_SPEED_RAMP_MAX, now * CANDY_SPEED_RAMP_RATE)
interval = max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL - now * SPAWN_INTERVAL_RAMP_RATE)
```

Candies accelerate from 340 px/s toward a 600 px/s ceiling, and the spawn interval tightens from 900 ms toward a 420 ms floor. Because both are pure functions of the clock, `engine.reset()` resetting `elapsedTime` is enough to restore starting difficulty — there is no separate difficulty state to forget.

**The collision test only checks X (step 10).** Y overlap is implied: hero and candy are both vertically centred in the same lane, and lane membership is already checked with an integer comparison. Testing Y would be redundant work in the hot loop. The hitbox is the hero inset by `HERO_HITBOX_PADDING` (18 px) on the X axis, taken from the design's collision math.

**Known debt — lane transition.** During the 130 ms `withTiming` slide, `heroLane` already holds the destination lane while the sprite is still moving. Collision therefore uses the destination lane before the hero visually arrives. At the late-game 600 px/s, that is ~78 px of candy travel. This is documented in [troubleshooting.md](./troubleshooting.md) and should be revisited after device QA; the current choice favours a cheap hot loop over transition-accurate collision.

**Invulnerability** is a timestamp comparison, not a boolean plus a timer — `now >= invulnUntil`. No timer to cancel, no state to desynchronise, and it is naturally correct across resets. It lasts 1400 ms and drives four visible blinks.

### Bridges to React

Exactly three `runOnJS` calls exist, and each is rate-limited by construction:

| Call | Frequency |
|---|---|
| `applyFps` | once per second (loop-update rate, not presented FPS) |
| `applyHit` | at most once per 1.4 s (invulnerability window) |
| `applyScore` | once per candy dodged |

---

## State — `src/store/gameStore.ts`

Zustand holds only what the UI renders:

```ts
GameState = { screen, who, lives, score, best, fps }
```

Hero position, candy positions, scroll offset and flicker phase are deliberately **not** here. Putting them in the store is the single easiest way to destroy the frame rate.

`hitHero` decrements lives; reaching 0 sets `screen: 'over'` and folds `score` into `best` in the same transition, so the record is captured without a separate effect. `reset` restores initial state but preserves `who` and `best` — the player's hero choice and record survive a new match.

**Zustand over Context:** Context re-renders every consumer on every change. Zustand's selector subscriptions mean only the components reading a given field re-render. `GameScreen` subscribes field by field for exactly this reason.

---

## Rendering — `src/render/` and `src/features/game/`

The Skia tree is static in shape. It mounts, back to front:

1. `Tablecloth` — scrolling kitchen table, driven by `scrollX`
2. `LaneDividers` — dashed lane separators
3. `Foodie who="vilao"` — the villain, floating on a `useBob(12, 900)`
4. 8 `CandySlot` groups — position and opacity from shared values, spin shared
5. Hero group — shadow oval plus `Foodie who={who}`, opacity from `heroOpacity`

Skia reads shared values directly, so mutating one repaints without a React render. The node count never changes during play.

### Feature module layout

Each screen-level feature owns its implementation and local styles:

```
src/features/
├── loading/       LoadingScreen.tsx + LoadingScreen.styles.ts
├── select/        SelectScreen.tsx + SelectScreen.styles.ts
├── game/          GameScreen.tsx
└── game-over/     GameOverModal.tsx + GameOverModal.styles.ts
```

Each feature exposes a small `index.ts` interface, and `src/features/index.ts` is
the composition seam consumed by `App.tsx`. Local styles and implementation
details stay inside the feature folder. `src/app/` contains shell-only concerns
such as `appStyles.ts`.

### Characters

`Foodie` dispatches on `who` to `Alface`, `Feijao`, `Arroz` or `Vilao`, and uniformly scales each to the requested pixel size from its design viewBox (heroes 120×150, villain 150×160). Geometry is ported verbatim from `docs/design/project/Foodie.dc.html` — that file is the source of truth, not the code.

`useWalkCycle` mirrors the design's CSS keyframes: legs swing ±16°, arms ±14° counter-phase, body bobs 3 px, all on a 320 ms half-cycle.

### Animation primitives — `src/render/anim.ts`

Three hooks, all returning a shared value driven by `withRepeat`:

| Hook | Motion |
|---|---|
| `useSwing(deg, ms)` | Ping-pong rotation, −deg to +deg |
| `useBob(px, ms)` | Ping-pong vertical translation |
| `useSpin(ms, dir)` | Continuous rotation, 0 to 2π |

These run on the UI thread independently of the frame loop. They are declarative and self-driving, so the worklet does not have to advance them.

### HUD

`Hud`, `GameOverModal` and the control hint are ordinary React Native views layered above the canvas, driven by Zustand. The loop-rate readout renders **only under `__DEV__`** — it is a development instrument, not part of the game.

---

## Theme — `src/theme/`

| File | Role |
|---|---|
| `tokens.ts` | Colours, radii, spacing, Fredoka font families — the whole palette in one object |
| `ThemeContext.tsx` | `ThemeProvider` and `useTheme` |
| `useUiScale.ts` | Scales UI against viewport so the layout survives different screen heights |

Every colour lives in `theme.colors`; gameplay and UI import the same tokens, so they cannot drift apart. Colour literals should not appear in components.

---

## Input — `src/components/SwipeHandler.tsx`

Two `Gesture.Fling()` detectors — one for `Directions.UP`, one for `Directions.DOWN` — combined with `Gesture.Race`. Two gestures rather than one because Fling's `onEnd` payload does not carry the direction that triggered it.

A third `Gesture.Tap()` maps the tap's Y to a lane direction: top half moves up, bottom half moves down. The three gestures race, so a tap cannot also fire a fling. `onEnd` is a worklet, so it hands the direction to JS via `runOnJS`. A 100 ms debounce on the JS side prevents one physical input from registering twice and is shared by flings and taps.

`GameScreen` wraps only the canvas in the gesture detector; the HUD and Game Over modal sit outside it, so their buttons cannot move the hero. It also wraps `engine.moveLane` so the first lane change dismisses the control hint. `moveLane` clamps to `[0, 2]`, ignores no-op moves, refuses to run on game over, and animates `heroY` with `withTiming` over 130 ms per the design.

**Trade-off:** Fling is a discrete gesture, so the hero cannot be dragged continuously between lanes. That matches the three-lane design and gives the cheapest possible input path.

---

## Tunable constants — `src/types/constants.ts`

| Constant | Value | Effect |
|---|---|---|
| `HERO_X_RATIO` | 0.09 | Hero's horizontal position as a fraction of width |
| `HERO_WIDTH` / `HERO_HEIGHT` | 96 / 120 | Hero size and hitbox basis |
| `HERO_HITBOX_PADDING` | 18 | X-axis inset; higher is more forgiving |
| `HERO_LANE_TRANSITION_DURATION` | 130 ms | Lane switch duration |
| `MAX_FRAME_DELTA_MS` | 50 ms | Maximum delta the loop will integrate after a stall or resume |
| `CANDY_SIZE` | 52 | Candy size and hitbox |
| `CANDY_BASE_SPEED` | 340 px/s | Starting speed |
| `CANDY_SPEED_RAMP_MAX` / `_RATE` | 260 / 0.006 | Ceiling and slope of the speed ramp |
| `SPAWN_INTERVAL` | 900 ms | Starting spawn interval |
| `SPAWN_INTERVAL_MIN` / `_RAMP_RATE` | 420 / 0.004 | Floor and slope of the interval ramp |
| `OBSTACLE_MAX_ACTIVE` | 8 | Pool size — the cheapest frame-rate lever |
| `INVULN_DURATION` | 1400 ms | Invulnerability and flicker length |
| `SCORE_PER_DODGE` | 10 | Points per dodged candy |

---

## Decisions, in short

| Decision | Reason | Cost |
|---|---|---|
| Game loop in a UI-thread worklet | Removes React from the frame budget entirely | Logic must be worklet-safe; harder to unit test |
| Fixed candy pool | Zero per-frame allocation, no GC pauses | Spawns are dropped if the pool saturates |
| `opacity` for visibility | Avoids mount/unmount churn in the Skia tree | Hidden nodes still cost a draw call |
| Candy type derived from slot index | Avoids state for a per-slot constant | Type distribution is fixed, not random |
| One shared spin phase | One animation instead of eight | Candies cannot spin independently |
| Difficulty derived from the clock | Reset restores difficulty for free | Ramp cannot be adjusted mid-match |
| Zustand for discrete state only | Selector subscriptions, no tree-wide re-renders | Two sources of truth to keep straight |
| `GameScreen` mounted for `'game'` and `'over'` | Replay without remount; modal over a frozen scene | Screen state must gate the loop |
| AABB collision, X axis only | Cheapest test that is correct given lane checks | Assumes sprites centred in lanes |
| Timestamp-based invulnerability | No timers to cancel or desynchronise | Depends on the monotonic game clock |
| Frame delta clamped to 50 ms | A background/resume pause cannot teleport the field | Simulation slows during a long stall |
| Gameplay gestures scoped to the canvas | HUD/modal buttons cannot move the hero | The whole top bar is outside the gesture surface |
| Geometry ported from the design HTML | Single source of truth for shapes | Changes must start in `docs/design/` |

---

## Where the frame rate goes

The POC's frame-rate criterion is unresolved: the last recorded run measured 30–50 fps on mid-range ARM with a much simpler scene, and that figure has not been re-measured. v0.0.1 draws considerably more — character geometry, a scrolling background, lane dividers, a floating villain — so the POC's result does not transfer automatically. **That measurement has not been taken; QA on ARM hardware is outstanding.**

The loop itself is O(8) with no allocation and is not the bottleneck. Cost is in the Skia render path.

Cheapest levers, in order:

1. Lower `OBSTACLE_MAX_ACTIVE` — directly removes draw calls
2. Raise `SPAWN_INTERVAL_MIN` — fewer simultaneous candies at high difficulty
3. Simplify `Tablecloth` — a full-screen scrolling layer repainted every frame
4. Reduce character path complexity in `src/render/foodie/characters/`

Background and analysis from the POC: [results.md](./results.md).

---

## References

- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [Reanimated — shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value)
- [Reanimated — `useFrameCallback`](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useFrameCallback)
- [Gesture Handler — Fling](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/fling-gesture)
- [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/)
- [Game Programming Patterns — Game Loop](https://gameprogrammingpatterns.com/game-loop.html)
