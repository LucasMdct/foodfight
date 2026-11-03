# Architecture

How Food Fight is built, and why it is built this way.

**Scope:** this describes the code as it exists on `feature/v003`. It covers the v0.0.1 game, the v0.0.2 combat loop, and the v0.0.3 difficulty/Barão 2.0 feature. The POC that preceded it is documented in [results.md](./results.md).

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
        ├─ features/difficulty  screen === 'difficulty'
        └─ features/game         screen === 'game' | 'over' | 'win'
             │
             ├─ useRunnerEngine(width, height, difficulty)   ← all gameplay lives here
             │     └─ useFrameCallback worklet (UI thread)
             │           ├─ loop-rate sampling
             │           ├─ tablecloth scroll
             │           ├─ selected difficulty ramp
             │           ├─ Barão lane-origin spawns and 100-point bursts
             │           ├─ typed enemy spawn + recycling
             │           ├─ power-shot and food-bubble pools
             │           ├─ villain HP and AABB collision
             │           └─ invulnerability flicker
             │
             ├─ SwipeHandler      Fling/tap gestures → engine.moveLane()
             ├─ Canvas            Skia scene: tablecloth, lanes, villain, pools, hero
             ├─ Hud               lives, score, HP, charges, power button, exit
             └─ features/game-over screen === 'over' | 'win'
                      │
                      └─ useGameStore (Zustand)  discrete state only
```

**Data flow is one-directional per thread:**

- UI thread: worklet writes shared values → Skia reads them → pixels. No React involved.
- JS thread: worklet calls `scheduleOnRN` on discrete events → Zustand updates → HUD re-renders.

---

## Screen flow — `App.tsx` and `gameStore`

```
LoadingScreen ──fonts loaded + intro done──▶ SelectScreen
SelectScreen  ──pick(who) + toDifficulty()▶ DifficultyScreen
DifficultyScreen ──start(difficulty)──────▶ GameScreen (screen: 'game')
GameScreen    ──villain HP reaches 0─────▶ ResultModal (screen: 'win')
GameScreen    ──lives reach 0────────────▶ ResultModal (screen: 'over')
                                             ├─ play again → screen: 'game' (same difficulty)
                                            └─ switch hero → screen: 'select'
```

`GameScreen` renders for **`'game'`, `'over'` and `'win'`** — the result modal draws on top of a frozen scene rather than replacing it. The engine arms a local UI-thread freeze before scheduling a terminal hit bridge, so a late enemy event cannot change a win into an over result. `GameScreen` calls `engine.reset()` when entering `'game'`, covering the first match and every restart without remounting the screen.

Orientation is locked to landscape once, in `App.tsx`. There is no orientation selection screen — that was a POC artifact.

---

## The engine — `src/hooks/useRunnerEngine.ts`

One hook holds the entire game loop. There is no `systems/` directory: splitting the loop into modules would mean crossing the worklet boundary or allocating per frame.

### Shared values

Created once with `makeMutable` and memoised so they survive re-renders:

| Value                                                                                | Purpose                                           |
| ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `heroLane`                                                                           | 0, 1, 2 — current lane index                      |
| `heroY`                                                                              | Animated top-Y of the hero                        |
| `heroOpacity`                                                                        | Drives the invulnerability flicker                |
| `invulnUntil`                                                                        | Game-clock timestamp when invulnerability ends    |
| `elapsedTime`                                                                        | Monotonic game clock, survives re-renders         |
| `lastUpdateTime`                                                                     | Frame timestamp of the last accepted update       |
| `scrollX`                                                                            | Tablecloth scroll offset, 0 to −88                |
| `candySpin`                                                                          | One shared spin phase for every candy             |
| `obstacleX[]`, `obstacleY[]`, `obstacleLane[]`, `obstacleKind[]`, `obstacleActive[]` | Ten-slot typed enemy state                        |
| `shotX[]`, `shotY[]`, `shotActive[]`                                                 | Three-slot power-shot state                       |
| `bubbleX`, `bubbleY`, `bubbleActive`                                                 | One visible food bubble at a time                 |
| `villainY`, `villainHpMirror`, `charges`, `powerIndex`, `difficultyIndex`             | UI-thread villain, fire, and difficulty mirrors   |
| `livesMirror`, `scoreMirror`, `rngState`                                             | Local collision/result state and seeded PRNG      |
| `spawnAccum`, `bubblePending`, `bubbleThreshold`, `nextMilestone`, `powerUntilScore`  | Score and spawn accumulators                     |
| `obstacleResistant[]`, `burstPending`, `burstLane`, `burstNextAt`                    | Resistant Barão burst metadata                   |
| `frozen`                                                                             | 1 freezes the simulation before a terminal bridge |

### The typed enemy and power pools

`ENEMY_POOL_SIZE` (10) and `POWER_SHOT_POOL_SIZE` (3) are pool sizes, not dynamic collections. Ten enemy slots and three shot slots are mounted once by `GameScreen`; spawning means finding an inactive slot and setting its shared values, while despawning sets `active` back to 0.

`obstacleActive` doubles as the group's `opacity`, so hiding is free — no conditional rendering, no key churn, no React reconciliation.

**Enemy type is tracked per spawn.** `obstacleKind[]` stores the numeric `ProjectileKind` selected by `projectileKindAt(attackPhaseAt(score), rngUnit(rngState))`. `GameScreen` renders all four variants in each slot and switches them with opacity; the primary path therefore avoids React re-renders while preserving per-spawn distribution.

**All candy variants share one spin animation.** `candySpin` is a single `useSpin(900)` phase passed to every slot. Zumbi uses the static design geometry plus the Skia Fredoka `HA HA!` label loaded once by `GameScreen`.

**Consequence:** zero allocation per frame, and therefore no GC pressure from the loop. This is what kept memory flat through the POC's stress testing.

**Trade-off:** if all 10 enemy slots or all 3 shot slots are busy, that spawn/fire request is skipped. The v0.0.2 performance gate permits the approved typed sub-pool fallback if the four-variant opacity tree exceeds the p95 budget. v0.0.3 adds only preallocated resistant flags and burst counters; it does not add a dynamic projectile collection.

### The frame loop

```
useFrameCallback(frame):
  1. bootstrap lastUpdateTime on the first frame
  2. elapsed = frame.timestamp - lastUpdateTime
  3. if elapsed < 16.0ms → return          ← throttle
  4. advance elapsedTime by the real delta
  5. loop rate: count updates, emit one sample per second via scheduleOnRN
  6. if frozen → return                      ← freezes everything below
  7. tablecloth scroll: 88px loop every 900ms
  8. selected difficulty: derive speed, interval, and double-spawn chance from elapsed time
  9. spawn: use the current Barão lane, advance the seeded PRNG, and activate typed slots
 10. milestone: every 100 score points queue one charge and three resistant zombies
 11. move active power shots with soft villain-Y tracking and resolve villain hits first
 12. for each active enemy:
       move left by speed * dt
       if power mode and non-resistant? deactivate and +10 score
       off-screen? → deactivate, +10 score
       same lane as hero and not invulnerable? → AABB test on X
 13. serve pending bubble thresholds one at a time
 14. flicker: derive heroOpacity from time remaining on invulnUntil
```

Details worth knowing before touching this:

**The 16.0 ms throttle (step 3).** `useFrameCallback` fires at the display refresh rate, which is 90 Hz or 120 Hz on many devices. The throttle caps the simulation update cadence at roughly 60 per second; it does not change gameplay speed because movement uses the real measured delta. On a 90 Hz panel it accepts every other frame (~45 updates/s); on a 120 Hz panel it caps at 60. The in-app `fps` value is therefore **loop-update rate**, not presented frame rate — use the platform profiler for real frame timing.

**Frame delta and app state (steps 2–3).** The measured delta is clamped to `MAX_FRAME_DELTA_MS` (50 ms). Without that clamp, returning from the background produces one huge delta: candies teleport off-screen, each scores, and the field clears. The loop also freezes while `AppState` is not `active`, and resets `lastUpdateTime` on resume so the first frame re-bootstraps instead of integrating the pause.

**The terminal gate (step 6) freezes the scene, not just gameplay.** Scroll, spawn, movement and collision sit below it, so the result modal draws over a still tablecloth. Loop-rate sampling sits above it and keeps running. The flag is set locally before `scheduleOnRN` sends the terminal hit, preventing result races.

**The selected difficulty (step 8)** is mirrored as a numeric shared value and resolved to a static preset every frame. Its ramp is derived from `elapsedTime` rather than stored:

```
speed    = preset.speed + min(280, now * preset.acceleration)
interval = max(400, preset.interval - now * 0.003)
```

The four presets are Muito Fácil (215 px/s / 1450 ms), Fácil (300 / 1050), Difícil (430 / 760), and Impossível (560 / 540). Each also supplies its double-spawn chance and acceleration. `engine.reset()` restores the selected preset and its counters.

**Milestones and power mode.** When the UI-thread score mirror crosses 100 points, the loop increments the capped charge mirror, schedules one discrete charge bridge and queues three resistant zombies. The burst lane is captured from the current Barão lane and slots are activated one at a time with a 140 ms spacing. An accepted power shot sets `powerUntilScore` to `score + 40`; normal enemies ahead of the hero are cleared for score, while resistant burst enemies continue.

**The collision test only checks X (step 10).** Y overlap is implied: hero and candy are both vertically centred in the same lane, and lane membership is already checked with an integer comparison. Testing Y would be redundant work in the hot loop. The hitbox is the hero inset by `HERO_HITBOX_PADDING` (18 px) on the X axis, taken from the design's collision math.

**Known debt — lane transition.** During the 130 ms `withTiming` slide, `heroLane` already holds the destination lane while the sprite is still moving. Collision therefore uses the destination lane before the hero visually arrives. At the late-game 600 px/s, that is ~78 px of candy travel. This is documented in [troubleshooting.md](./troubleshooting.md) and should be revisited after device QA; the current choice favours a cheap hot loop over transition-accurate collision.

**Invulnerability** is a timestamp comparison, not a boolean plus a timer — `now >= invulnUntil`. No timer to cancel, no state to desynchronise, and it is naturally correct across resets. It lasts 1400 ms and drives four visible blinks.

### Bridges to React

`scheduleOnRN` is used only for discrete events, and the fire bridge is emitted only after the UI thread has accepted a slot and decremented its local charge mirror:

| Call                     | Frequency                                             |
| ------------------------ | ----------------------------------------------------- |
| `applyFps`               | once per second (loop-update rate, not presented FPS) |
| `applyHeroHit`           | at most once per 1.4 s (invulnerability window)       |
| `applyVillainHit`        | once per accepted shot reaching the villain           |
| `applyPowerFired(index)` | once per accepted UI-thread fire                      |
| `applyFoodCollected`     | once per bubble pickup                                |
| `applyPowerCharge`       | once per crossed 100-point milestone                  |
| `applyVillainBurst`      | once per crossed 100-point milestone                  |
| `applyScore`             | once per enemy dodged                                 |

---

## State — `src/store/gameStore.ts`

Zustand holds only what the UI renders:

```ts
GameState = {
  screen,
  who,
  difficulty,
  lives,
  score,
  best,
  fps,
  villainHp,
  charges,
  powerIndex,
  toast,
  toastId,
  villainMood,
  villainAttacking,
  villainTaunt,
};
```

Hero position, enemy/shot positions, bubble position, scroll offset, flicker phase and the authoritative UI-thread charge mirror are deliberately **not** React state. Putting per-frame values in the store is the single easiest way to destroy the frame rate. The store keeps the discrete UI projection and guards every terminal action by `screen === 'game'`.

`hitHero` decrements lives; reaching 0 sets `screen: 'over'` and folds `score` into `best`. `applyVillainHit` decrements HP; reaching 0 sets `screen: 'win'` and captures the record. `applyPowerFired` refuses to overdraw charges, `collectFood` caps food pickups at three, and `grantPowerCharge` handles the 100-point milestone toast. `triggerVillainBurst` exposes only the discrete attack animation and taunt. `reset` restores initial state but preserves `who`, `difficulty`, and `best`.

**Zustand over Context:** Context re-renders every consumer on every change. Zustand's selector subscriptions mean only the components reading a given field re-render. `Hud` and the development loop readout own the leaf subscriptions, while `GameScreen` subscribes only to scene selection and villain mood, so combat HUD updates do not re-render the Canvas subtree.

---

## Rendering — `src/render/` and `src/features/game/`

The Skia tree is static in shape. It mounts, back to front:

1. `Tablecloth` — scrolling kitchen table, driven by `scrollX`
2. `LaneDividers` — dashed lane separators
3. `Foodie who="vilao"` — the 184px Barão with aura/attack scale, vertically positioned by the 1.7 s UI-thread cycle
4. 10 `CandySlot` groups — each has four opacity-switched typed variants
5. 3 `PowerShotSlot` groups and one `FoodBubble` group — fixed pools
6. Hero group — shadow oval plus `Foodie who={who}`, opacity from `heroOpacity`

Skia reads shared values directly, so mutating one repaints without a React render. The node count never changes during play.

### Feature module layout

Each screen-level feature owns its implementation and local styles:

```
src/features/
├── loading/       LoadingScreen.tsx + LoadingScreen.styles.ts
├── select/        SelectScreen.tsx + SelectScreen.styles.ts
├── difficulty/    DifficultyScreen.tsx + DifficultyScreen.styles.ts
├── game/          GameScreen.tsx
└── game-over/     GameOverModal.tsx + GameOverModal.styles.ts
```

Each feature exposes a small `index.ts` interface, and `src/features/index.ts` is
the composition seam consumed by `App.tsx`. Local styles and implementation
details stay inside the feature folder. `src/app/` contains shell-only concerns
such as `appStyles.ts`.

### Characters

`Foodie` dispatches on `who` to `Alface`, `Feijao`, `Arroz` or `Vilao`, and uniformly scales each to the requested pixel size from its design viewBox (heroes 120×150, villain 150×160). The game passes `animated={false}` to the villain because its 1.7 s combat motion is driven by `villainY`; selection and result screens keep the decorative bob. `VillainMood` and the 1.2 s `bravo` timer are wired through the store, and `Vilao.tsx` now uses the exact `bravo` brow and mouth paths from the imported `Foodie.dc.html` source. Geometry is ported from the design bundle — that bundle is the source of truth, not the code.

`useWalkCycle` mirrors the design's CSS keyframes: legs swing ±16°, arms ±14° counter-phase, body bobs 3 px, all on a 320 ms half-cycle.

### Animation primitives — `src/render/anim.ts`

Three hooks, all returning a shared value driven by `withRepeat`:

| Hook                | Motion                           |
| ------------------- | -------------------------------- |
| `useSwing(deg, ms)` | Ping-pong rotation, −deg to +deg |
| `useBob(px, ms)`    | Ping-pong vertical translation   |
| `useSpin(ms, dir)`  | Continuous rotation, 0 to 2π     |

These run on the UI thread independently of the frame loop. They are declarative and self-driving, so the worklet does not have to advance them.

### HUD

`Hud`, `GameOverModal` and the control hint are ordinary React Native views layered above the canvas, driven by Zustand. The loop-rate readout renders **only under `__DEV__`** — it is a development instrument, not part of the game.

---

## Theme — `src/theme/`

| File               | Role                                                                             |
| ------------------ | -------------------------------------------------------------------------------- |
| `tokens.ts`        | Colours, radii, spacing, Fredoka font families — the whole palette in one object |
| `ThemeContext.tsx` | `ThemeProvider` and `useTheme`                                                   |
| `useUiScale.ts`    | Scales UI against viewport so the layout survives different screen heights       |

Every colour lives in `theme.colors`; gameplay and UI import the same tokens, so they cannot drift apart. Colour literals should not appear in components.

---

## Input — `src/components/SwipeHandler.tsx`

Two `Gesture.Fling()` detectors — one for `Directions.UP`, one for `Directions.DOWN` — combined with `Gesture.Race`. Two gestures rather than one because Fling's `onEnd` payload does not carry the direction that triggered it.

A third `Gesture.Tap()` maps the tap's Y to a lane direction: top half moves up, bottom half moves down. The three gestures race, so a tap cannot also fire a fling. `onEnd` is a worklet, so it hands the direction to JS via `scheduleOnRN`. A 100 ms debounce on the JS side prevents one physical input from registering twice and is shared by flings and taps.

`GameScreen` wraps only the canvas in the gesture detector; the HUD and result modal sit outside it, so their buttons cannot move the hero. Lane input still uses the fling/tap path. The HUD power button uses native `onPressIn` and calls `engine.firePower`; the UI thread validates the charge and free shot slot before scheduling `applyPowerFired(index)`. `moveLane` clamps to `[0, 2]`, ignores no-op moves, refuses to run after a result, and animates `heroY` with `withTiming` over 130 ms.

**Trade-off:** Fling is a discrete gesture, so the hero cannot be dragged continuously between lanes. That matches the three-lane design and gives the cheapest possible input path.

---

## Tunable constants — `src/types/constants.ts`

| Constant                                   | Value       | Effect                                                        |
| ------------------------------------------ | ----------- | ------------------------------------------------------------- |
| `HERO_X_RATIO`                             | 0.09        | Hero's horizontal position as a fraction of width             |
| `HERO_WIDTH` / `HERO_HEIGHT`               | 96 / 120    | Hero size and hitbox basis                                    |
| `HERO_HITBOX_PADDING`                      | 18          | X-axis inset; higher is more forgiving                        |
| `HERO_LANE_TRANSITION_DURATION`            | 130 ms      | Lane switch duration                                          |
| `MAX_FRAME_DELTA_MS`                       | 50 ms       | Maximum delta the loop will integrate after a stall or resume |
| `CANDY_SIZE`                               | 52          | Base candy geometry before the v0.0.3 visual scale             |
| `PROJECTILE_SIZE_MULTIPLIER`               | 1.3         | v0.0.3 normal projectile scale                                |
| `CANDY_SPEED_RAMP_MAX` / `_RATE`           | 260 / 0.006 | Ceiling and slope of the speed ramp                           |
| `SPAWN_INTERVAL`                           | 900 ms      | Starting spawn interval                                       |
| `SPAWN_INTERVAL_MIN` / `_RAMP_RATE`        | 420 / 0.004 | Floor and slope of the interval ramp                          |
| `INVULN_DURATION`                          | 1400 ms     | Invulnerability and flicker length                            |
| `SCORE_PER_DODGE`                          | 10          | Points per dodged candy                                       |
| `VILLAIN_HP`                               | 5           | Shots required to win                                         |
| `VILLAIN_RENDER_WIDTH` / `_HEIGHT`         | 184 / 198   | v0.0.3 Barão visual bounds                                     |
| `ZOMBIE_RENDER_SIZE`                        | 96          | v0.0.3 zombie visual and hitbox basis                          |
| `VILLAIN_BURST_COUNT`                       | 3           | Resistant zombies per 100-point milestone                      |
| `MILESTONE_SCORE_STEP`                      | 100         | Score interval for charge and burst                            |
| `POWER_MODE_SCORE_DURATION`                | 40          | Score points for normal-projectile clear mode                  |
| `POWER_MAX_CHARGES`                        | 3           | Charge cap                                                    |
| `BUBBLE_EVERY`                             | 300         | Score threshold for a pending food bubble                     |
| `POWER_SHOT_SPEED`                         | 620 px/s    | Horizontal shot speed                                         |
| `ENEMY_POOL_SIZE` / `POWER_SHOT_POOL_SIZE` | 10 / 3      | Fixed enemy and shot pools                                    |
| `BUBBLE_SIZE` / `ZOMBIE_SIZE`              | 72 / 76     | Bubble and zumbi geometry bases                               |
| `VILLAIN_CYCLE_MS`                         | 1700 ms     | Full villain vertical cycle                                   |
| `ENEMY_SPAWN_X_OFFSET` / `ENEMY_DESPAWN_X` | 90 / −100   | Spawn and recycle boundaries                                  |
| `BUBBLE_HITBOX_PADDING`                    | 14          | Forgiving food-bubble collection padding                      |

---

## Decisions, in short

| Decision                                                | Reason                                                   | Cost                                                 |
| ------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Game loop in a UI-thread worklet                        | Removes React from the frame budget entirely             | Logic must be worklet-safe; harder to unit test      |
| Fixed typed pools                                       | Zero per-frame allocation, no GC pauses                  | Spawns/fires are dropped if a pool saturates         |
| `opacity` for visibility                                | Avoids mount/unmount churn in the Skia tree              | Hidden nodes still cost a draw call                  |
| Per-spawn numeric projectile kind                       | Supports phase distribution without React state          | Four opacity-switched variants cost extra draw nodes |
| One shared spin phase                                   | One animation instead of ten                             | Candies cannot spin independently                    |
| Difficulty derived from the clock                       | Reset restores difficulty for free                       | Ramp cannot be adjusted mid-match                    |
| Zustand for discrete state only                         | Selector subscriptions, no tree-wide re-renders          | Two sources of truth to keep straight                |
| `GameScreen` mounted for `'game'`, `'over'` and `'win'` | Replay without remount; result modal over a frozen scene | Screen state must gate the loop                      |
| UI-thread fire authorization                            | Double taps cannot spend one charge twice                | Store receives an asynchronous discrete event        |
| Local terminal freeze before bridge                     | Late collision cannot change a terminal result           | UI and JS state converge asynchronously              |
| AABB collision, X axis only                             | Cheapest test that is correct given lane checks          | Assumes sprites centred in lanes                     |
| Timestamp-based invulnerability                         | No timers to cancel or desynchronise                     | Depends on the monotonic game clock                  |
| Frame delta clamped to 50 ms                            | A background/resume pause cannot teleport the field      | Simulation slows during a long stall                 |
| Gameplay gestures scoped to the canvas                  | HUD/modal buttons cannot move the hero                   | The whole top bar is outside the gesture surface     |
| Geometry ported from the design HTML                    | Single source of truth for shapes                        | Changes must start in `docs/design/`                 |

---

## Where the frame rate goes

The POC's frame-rate criterion is unresolved: the last recorded run measured 30–50 fps on mid-range ARM with a much simpler scene, and that figure has not been re-measured. v0.0.3 adds enlarged projectiles, a larger Barão, aura/attack animation, and milestone bursts, so the POC's result does not transfer automatically. **The v0.0.3 device measurement is still outstanding.** The acceptance gate is average ≥55 fps and minimum ≥50 fps when the v0.0.1 baseline meets those bars; otherwise the relative gate is p95 frame time no more than 10% above baseline, recorded with `dumpsys gfxinfo` or Metal System Trace.

The loop itself is O(10) over the fixed enemy pool with no allocation and is not the bottleneck. Cost is in the Skia render path.

Cheapest levers, in order:

1. Switch from the four-variant opacity tree to the approved typed sub-pool fallback — directly removes hidden variant draws
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
