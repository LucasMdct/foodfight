# Architecture

How Food Fight is built, and why it is built this way.

**Scope:** this describes the current game through v0.0.4: fixed difficulty presets, bubble-only charges, full-screen power clears, typed Barão dialogue with a talking mouth, laughing zombies, a 224 × 242 Barão, and the staged defeat sequence. The POC that preceded the game is documented in [results.md](./results.md).

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
        ├─ features/difficulty   screen === 'difficulty'
        └─ features/game         screen === 'game' | 'over' | 'win'
             │
             ├─ useRunnerEngine(width, height, difficulty)   ← all gameplay lives here
             │     └─ useFrameCallback worklet (UI thread)
             │           ├─ loop-rate sampling
             │           ├─ tablecloth scroll
             │           ├─ selected fixed difficulty preset
             │           ├─ Barão lane-origin spawns and 100-point bursts
             │           ├─ typed enemy spawn + recycling
             │           ├─ power-shot, food-bubble, and confetti pools
             │           ├─ villain HP, staged defeat, and AABB collision
             │           └─ invulnerability flicker
             │
             ├─ SwipeHandler      Fling/tap gestures → engine.moveLane()
             ├─ Canvas            Skia scene: tablecloth, lanes, villain, pools, hero
             ├─ villainDialogue   65 ms/char JS-side typewriter controller
             ├─ Hud               lives, score, HP, charges, 126px power button, exit
             └─ features/game-over screen === 'over' | 'win'
                      │
                      └─ useGameStore (Zustand)  discrete state only
```

**Data flow is one-directional per thread:**

- UI thread: worklet writes shared values → Skia reads them → pixels. No React involved.
- JS thread: worklet calls `scheduleOnRN` on discrete events → Zustand updates → HUD and dialogue controller respond.

---

## Screen flow — `App.tsx` and `gameStore`

```
LoadingScreen ──fonts loaded + intro done──▶ SelectScreen
SelectScreen  ──pick(who) + toDifficulty()▶ DifficultyScreen
DifficultyScreen ──start(difficulty)──────▶ GameScreen (screen: 'game')
GameScreen    ──villain HP reaches 0─────▶ staged defeat (2.5 s) ──▶ ResultModal (screen: 'win')
GameScreen    ──lives reach 0────────────▶ ResultModal (screen: 'over')
                                             ├─ play again → screen: 'game' (same difficulty)
                                             └─ switch hero → screen: 'select'
```

`GameScreen` renders for **`'game'`, `'over'` and `'win'`** — the result modal draws on top of a frozen scene rather than replacing it. The engine arms a local UI-thread freeze before scheduling a terminal hit bridge, so a late enemy event cannot change a win into an over result. When the final shot reduces the Barão to 0 HP, the match enters a 2,500 ms staged defeat state (`villainDying: true`, `screen: 'game'`) that plays the inflate/shake/spin animation and nine confetti bursts before transitioning to `screen: 'win'`. `GameScreen` calls `engine.reset()` when entering `'game'`, covering the first match and every restart without remounting the screen.

Orientation is locked to landscape once, in `App.tsx`. There is no orientation selection screen — that was a POC artifact.

---

## The engine — `src/hooks/useRunnerEngine.ts`

One hook holds the entire game loop. There is no `systems/` directory: splitting the loop into modules would mean crossing the worklet boundary or allocating per frame.

### Shared values

Created once with `makeMutable` and memoised so they survive re-renders:

| Value                                                                                | Purpose                                                     |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `heroLane`                                                                           | 0, 1, 2 — current lane index                                |
| `heroY`                                                                              | Animated top-Y of the hero                                  |
| `heroOpacity`                                                                        | Drives the invulnerability flicker                          |
| `invulnUntil`                                                                        | Game-clock timestamp when invulnerability ends              |
| `elapsedTime`                                                                        | Monotonic game clock, survives re-renders                   |
| `lastUpdateTime`                                                                     | Frame timestamp of the last accepted update                 |
| `scrollX`                                                                            | Tablecloth scroll offset, 0 to −88                          |
| `candySpin`                                                                          | One shared spin phase for every candy                       |
| `obstacleX[]`, `obstacleY[]`, `obstacleLane[]`, `obstacleKind[]`, `obstacleActive[]` | Twelve-slot typed enemy state                               |
| `shotX[]`, `shotY[]`, `shotActive[]`                                                 | Three-slot power-shot state                                 |
| `bubbleX`, `bubbleY`, `bubbleActive`                                                 | One visible food bubble at a time                           |
| `villainY`, `villainHpMirror`, `charges`, `powerIndex`, `difficultyIndex`            | UI-thread villain, fire, and difficulty mirrors             |
| `livesMirror`, `scoreMirror`, `rngState`                                             | Local collision/result state and seeded PRNG                |
| `spawnAccum`, `bubblePending`, `bubbleThreshold`, `nextMilestone`                    | Score and spawn accumulators                                |
| `obstacleScored[]`, `burstPending`, `burstLane`, `burstNextAt`                       | Score ownership and Barão burst metadata                    |
| `burstFxX[]`, `burstFxY[]`, `burstFxActive[]`, `burstFxRotation[]`, `burstFxUntil[]` | Eight-slot centered confetti effect pool                    |
| `defeatActive`, `defeatStartedAt`, `defeatBurstIndex`                                | Staged Barão defeat clock and nine-burst confetti scheduler |
| `frozen`                                                                             | 1 freezes the simulation before a terminal bridge           |

### The typed enemy and power pools

`ENEMY_POOL_SIZE` (12), `POWER_SHOT_POOL_SIZE` (3), and `BURST_EFFECT_POOL_SIZE` (8) are pool sizes, not dynamic collections. Twelve enemy slots, three shot slots, one bubble slot, and eight confetti slots are mounted once by `GameScreen`; spawning means finding an inactive slot and setting its shared values, while despawning sets `active` back to 0.

`obstacleActive` doubles as the group's `opacity`, so hiding is free — no conditional rendering, no key churn, no React reconciliation.

**Enemy type is tracked per spawn.** `obstacleKind[]` stores the numeric `ProjectileKind` selected by `projectileKindAt(attackPhaseAt(score), rngUnit(rngState))`. `GameScreen` renders all four variants in each slot and switches them with opacity; the primary path therefore avoids React re-renders while preserving per-spawn distribution.

**All candy variants share one spin animation.** `candySpin` is a single `useSpin(900)` phase passed to every slot. Zumbi uses the v0.0.4 animated mouth (`scaleY` 0.3 to 1 on a 160 ms half-cycle) plus the looping Skia Fredoka `HA HA HA!` pill loaded once by `GameScreen`.

**Consequence:** zero allocation per frame, and therefore no GC pressure from the loop. This is what kept memory flat through the POC's stress testing.

**Trade-off:** if all 12 enemy slots or all 3 shot slots are busy, that spawn/fire request is skipped. A saturated eight-slot confetti pool skips only the effect; the clear and score still apply. The deterministic harness emits `spawnSkipped` for rejected requests. The v0.0.2 performance gate permits the approved typed sub-pool fallback if the four-variant opacity tree exceeds the p95 budget. Score flags and burst counters are preallocated; there is no dynamic projectile collection.

### The frame loop

```
useFrameCallback(frame):
  1. bootstrap lastUpdateTime on the first frame
  2. elapsed = frame.timestamp - lastUpdateTime
  3. if elapsed < 16.0ms → return          ← throttle
  4. advance elapsedTime by the real delta
  5. update active confetti slots and, if defeatActive, emit due defeat bursts and complete at 2500ms
  6. loop rate: count updates, emit one sample per second via scheduleOnRN
  7. if frozen → return                      ← freezes everything below
  8. tablecloth scroll: 88px loop every 900ms
  9. selected difficulty: read fixed speed, interval, and double-spawn chance from the preset
 10. spawn: use the current Barão lane for the primary projectile, use the approved adjacent-lane formula for an optional secondary, advance the seeded PRNG, and activate typed slots
 11. serve scheduled zombie bursts from the fixed pool
 12. move active power shots with soft villain-Y tracking and resolve villain hits at W - 230
 13. for each active enemy:
       move left by speed * dt
       off-screen? → mark scored, +10 once, deactivate
       same lane as hero and not invulnerable? → AABB test on X
 14. queue three zombies and one bubble per crossed 100-point threshold; serve bubbles one at a time
 15. flicker: derive heroOpacity from time remaining on invulnUntil
```

Details worth knowing before touching this:

**The 16.0 ms throttle (step 3).** `useFrameCallback` fires at the display refresh rate, which is 90 Hz or 120 Hz on many devices. The throttle caps the simulation update cadence at roughly 60 per second; it does not change gameplay speed because movement uses the real measured delta. On a 90 Hz panel it accepts every other frame (~45 updates/s); on a 120 Hz panel it caps at 60. The in-app `fps` value is therefore **loop-update rate**, not presented frame rate — use the platform profiler for real frame timing.

**Frame delta and app state (steps 2–3).** The measured delta is clamped to `MAX_FRAME_DELTA_MS` (50 ms). Without that clamp, returning from the background produces one huge delta: candies teleport off-screen, each scores, and the field clears. The loop also freezes while `AppState` is not `active`, and resets `lastUpdateTime` on resume so the first frame re-bootstraps instead of integrating the pause.

**The terminal gate (step 7) freezes gameplay while allowing defeat effects to finish.** Scroll, spawn, movement and collision sit below it, so the staged defeat and the result modal draw over a still tablecloth. Confetti expiration, defeat burst scheduling (nine bursts at `260 + i * 200` ms), and loop-rate sampling sit above it and keep running. The flag is set locally before `scheduleOnRN` sends the terminal hit, preventing result races.

**The selected difficulty (step 9)** is mirrored as a numeric shared value and resolved to a static preset every frame. Speed and interval remain fixed throughout a match. The four presets are Muito Fácil (215 px/s / 1450 ms), Fácil (300 / 1050), Difícil (430 / 760), and Impossível (560 / 540). Each also supplies a fixed double-spawn chance. `engine.reset()` restores the selected preset and its counters.

The first spawn starts after the handoff warmup accumulator (`INITIAL_SPAWN_ACCUMULATOR_MS`, 400 ms), not after a full preset interval. This keeps the opening readable while preserving the selected cadence afterward.

**Milestones, bubbles, and power.** Each crossed 100-point threshold queues one bubble and three zombies; it grants no charge. The burst lane is captured from the current Barão lane and slots are activated at the handoff timestamps 160, 460, and 760 ms. Bubbles are served one at a time, use 84 px render/collision bounds, and despawn when their left edge passes −90 px. Collection alone adds a charge, capped at three.

An accepted fire validates a charge and free shot slot on the UI thread, then immediately clears visible active enemies of every kind, including zombies and enemies behind the hero. The visibility check excludes sprites entirely left of the field and uses the handoff's right-edge tolerance of `screenWidth + 10`. Each slot is marked scored before it is released or its score bridge runs, so a later despawn cannot award another ten points. Every cleared slot requests confetti at its sprite center; the shot continues toward the Barão and hits at `screenWidth - 230` with an impact burst at `screenWidth - 150`. There is no persistent power window, so later spawns are unaffected.

**The collision test only checks X (step 13).** Y overlap is implied: hero and candy are both vertically centred in the same lane, and lane membership is already checked with an integer comparison. Testing Y would be redundant work in the hot loop. The hitbox is the hero inset by `HERO_HITBOX_PADDING` (18 px) on the X axis, taken from the design's collision math.

**Known debt — lane transition.** During the 130 ms `withTiming` slide, `heroLane` already holds the destination lane while the sprite is still moving. Collision therefore uses the destination lane before the hero visually arrives. At the late-game 560 px/s, that is ~73 px of candy travel. This is documented in [troubleshooting.md](./troubleshooting.md) and should be revisited after device QA; the current choice favours a cheap hot loop over transition-accurate collision.

**Invulnerability** is a timestamp comparison, not a boolean plus a timer — `now >= invulnUntil`. No timer to cancel, no state to desynchronise, and it is naturally correct across resets. It lasts 1400 ms and drives four visible blinks.

### Bridges to React

`scheduleOnRN` is used only for discrete events, and the fire bridge is emitted only after the UI thread has accepted a slot and decremented its local charge mirror:

- Every bridge carries the current match generation. A delayed callback from a previous replay is ignored by the JS-side generation guard.

| Call                         | Frequency                                              |
| ---------------------------- | ------------------------------------------------------ |
| `applyFps`                   | once per second (loop-update rate, not presented FPS)  |
| `applyHeroHit`               | at most once per 1.4 s (invulnerability window)        |
| `applyVillainHit`            | once per non-final shot reaching the villain           |
| `applyVillainDefeatStart`    | once when the final shot reduces villain HP to zero    |
| `applyVillainDefeatComplete` | once 2,500 ms after staged defeat begins               |
| `applyPowerFired(index)`     | once per accepted UI-thread fire                       |
| `applyFoodCollected`         | once per bubble pickup                                 |
| `applyVillainBurst`          | once per crossed 100-point milestone                   |
| `applyScore`                 | once per previously unscored enemy dodged or cleared   |

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
  villainDying,
  villainTalking,
  villainTalk,
  villainTaunt,
  villainTalkKind,
  villainTalkDurationMs,
};
```

Hero position, enemy/shot positions, bubble position, scroll offset, flicker phase and the authoritative UI-thread charge mirror are deliberately **not** React state. Putting per-frame values in the store is the single easiest way to destroy the frame rate. The store keeps the discrete UI projection and guards every gameplay mutation by `screen === 'game' && !villainDying`.

`hitHero` decrements lives; reaching 0 sets `screen: 'over'` and folds `score` into `best`. `applyVillainHit` decrements HP; reaching 0 (or calling `beginVillainDefeat`) enters the staged defeat state (`villainDying: true`, `villainMood: 'bravo'`, `screen: 'game'`). `completeVillainDefeat` transitions from that staged state to `screen: 'win'` and captures `best`. `applyPowerFired` refuses to overdraw charges and `collectFood` caps food pickups at three. `triggerVillainBurst`, `showVillainTaunt`, and `applyVillainHit` set the target dialogue line, hold duration (`2800 ms` taunt, `2200 ms` ouch, `2500 ms` defeat), and `villainTalking: true`; `createVillainDialogueController` in `src/features/game/villainDialogue.ts` reveals one character every `65 ms` on the JS side and clears `villainTalking` when typing finishes. `reset` restores initial state but preserves `who`, `difficulty`, and `best`.

**Zustand over Context:** Context re-renders every consumer on every change. Zustand's selector subscriptions mean only the components reading a given field re-render. `Hud` and the development loop readout own the leaf subscriptions, while `GameScreen` subscribes to scene selection, villain mood, villain attack/talking/dying state, and villain talk text, so unrelated combat HUD updates do not re-render the Canvas subtree.

---

## Rendering — `src/render/` and `src/features/game/`

The Skia tree is static in shape. It mounts, back to front:

1. `Tablecloth` — scrolling kitchen table, driven by `scrollX`
2. `LaneDividers` — dashed lane separators
3. `Foodie who="vilao"` — the 224 × 242 px Barão with aura, attack/shake/defeat transforms, and animated talking mouth, vertically positioned by the 1.7 s UI-thread cycle
4. 12 `CandySlot` groups — each has four opacity-switched typed variants
5. 8 `ConfettiBurstSlot` groups — centered confetti bursts with position separated from rotation
6. 3 `PowerShotSlot` groups and one `FoodBubble` group — fixed pools
7. Hero group — shadow oval plus `Foodie who={who}`, opacity from `heroOpacity`

Skia reads shared values directly, so mutating one repaints without a React render. The node count never changes during play.

### Feature module layout

Each screen-level feature owns its implementation and local styles:

```
src/features/
├── loading/       LoadingScreen.tsx + LoadingScreen.styles.ts
├── select/        SelectScreen.tsx + SelectScreen.styles.ts
├── difficulty/    DifficultyScreen.tsx + DifficultyScreen.styles.ts
├── game/          GameScreen.tsx + GameScreen.styles.ts + villainDialogue.ts
└── game-over/     GameOverModal.tsx + GameOverModal.styles.ts
```

Each feature exposes a small `index.ts` interface, and `src/features/index.ts` is
the composition seam consumed by `App.tsx`. Local styles and implementation
details stay inside the feature folder. `src/app/` contains shell-only concerns
such as `appStyles.ts`.

### Characters

`Foodie` dispatches on `who` to `Alface`, `Feijao`, `Arroz` or `Vilao`, and scales each to the requested pixel dimensions from its design viewBox (heroes 120×150, villain 150×160 scaled to 224×242 in gameplay). The game passes `animated={false}` to the villain because its 1.7 s combat motion is driven by `villainY`; selection and result screens keep the decorative bob. `VillainMood` (`1400 ms` `bravo` timer) and `talking` are wired through the store, and `Vilao.tsx` ports the exact `feliz`, `bravo`, and animated `talking` mouth paths from `Foodie.dc.html`. Geometry is ported from the design bundle — that bundle is the source of truth, not the code.

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

`Hud`, `GameOverModal` and the control hint are ordinary React Native views layered above the canvas, driven by Zustand. `Hud` places the 126 × 126 px circular `PODER!` button in the lower-right corner with a rotating dashed gold ring when charged and three charge dots underneath, keeping it out of the gameplay gesture surface. The loop-rate readout renders **only under `__DEV__`** — it is a development instrument, not part of the game.

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

| Constant                                       | Value          | Effect                                                        |
| ---------------------------------------------- | -------------- | ------------------------------------------------------------- |
| `HERO_X_RATIO`                                 | 0.09           | Hero's horizontal position as a fraction of width             |
| `HERO_WIDTH` / `HERO_HEIGHT`                   | 96 / 120       | Hero size and hitbox basis                                    |
| `HERO_HITBOX_PADDING`                          | 18             | X-axis inset; higher is more forgiving                        |
| `HERO_LANE_TRANSITION_DURATION`                | 130 ms         | Lane switch duration                                          |
| `MAX_FRAME_DELTA_MS`                           | 50 ms          | Maximum delta the loop will integrate after a stall or resume |
| `CANDY_SIZE`                                   | 52             | Base candy geometry before the v0.0.3 visual scale            |
| `PROJECTILE_SIZE_MULTIPLIER`                   | 1.3            | Normal projectile scale                                       |
| `INITIAL_SPAWN_ACCUMULATOR_MS`                 | 400 ms         | Opening spawn warmup                                          |
| `INVULN_DURATION`                              | 1400 ms        | Invulnerability and flicker length                            |
| `SCORE_PER_DODGE`                              | 10             | Points per dodged or power-cleared enemy                      |
| `VILLAIN_HP`                                   | 5              | Shots required to win                                         |
| `VILLAIN_RENDER_WIDTH` / `_HEIGHT`             | 224 / 242      | v0.0.4 Barão visual bounds                                    |
| `VILLAIN_SHOT_HIT_X_OFFSET` / `_EXPLOSION_X`   | 230 / 150      | Power-shot Barão collision and explosion offsets from right   |
| `VILLAIN_DEFEAT_DURATION_MS`                   | 2500 ms        | Staged Barão defeat duration before victory                   |
| `DIALOGUE_CHAR_INTERVAL_MS`                    | 65 ms          | Typewriter character reveal cadence                           |
| `VILLAIN_TAUNT_DURATION_MS` / `_OUCH_DURATION` | 2800 / 2200 ms | Taunt and ouch dialogue hold durations                        |
| `VILLAIN_TALK_DELAY_MS` / `_BRAVO_DURATION_MS` | 800 / 1400 ms  | Opening taunt delay and `bravo` mood duration                 |
| `VILLAIN_SHAKE_DURATION_MS`                    | 450 ms         | Barão hit shake duration                                      |
| `VILLAIN_BURST_DELAYS_MS`                      | `[160,460,760]`| Zombie burst spawn offsets                                    |
| `ZOMBIE_RENDER_SIZE`                           | 96             | Zombie visual and hitbox basis                                |
| `VILLAIN_BURST_COUNT`                          | 3              | Zombies per 100-point milestone                               |
| `MILESTONE_SCORE_STEP`                         | 100            | Score interval for zombie bursts                              |
| `POWER_MAX_CHARGES`                            | 3              | Charge cap                                                    |
| `BUBBLE_EVERY`                                 | 100            | Score threshold for a pending food bubble                     |
| `POWER_SHOT_SPEED`                             | 620 px/s       | Horizontal shot speed                                         |
| `ENEMY_POOL_SIZE` / `POWER_SHOT_POOL_SIZE`     | 12 / 3         | Fixed enemy and shot pools                                    |
| `BURST_EFFECT_POOL_SIZE` / `_DURATION_MS`      | 8 / 620 ms     | Fixed confetti pool size and visibility duration              |
| `BUBBLE_SIZE` / `ZOMBIE_SIZE`                  | 72 / 76        | Bubble and zumbi geometry bases                               |
| `BUBBLE_RENDER_SIZE` / `BUBBLE_DESPAWN_X`      | 84 / −90       | Bubble render bounds and left-edge recycle boundary           |
| `VILLAIN_CYCLE_MS`                             | 1700 ms        | Full villain vertical cycle                                   |
| `ENEMY_SPAWN_FROM_RIGHT` / `ENEMY_DESPAWN_X`   | 210 / −120     | Projectile spawn and recycle boundaries                       |
| `BUBBLE_HITBOX_PADDING`                        | 14             | Forgiving food-bubble collection padding                      |

---

## Decisions, in short

| Decision                                                | Reason                                                   | Cost                                                 |
| ------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Game loop in a UI-thread worklet                        | Removes React from the frame budget entirely             | Logic must be worklet-safe; harder to unit test      |
| Fixed typed pools                                       | Zero per-frame allocation, no GC pauses                  | Spawns/fires are dropped if a pool saturates         |
| `opacity` for visibility                                | Avoids mount/unmount churn in the Skia tree              | Hidden nodes still cost a draw call                  |
| Per-spawn numeric projectile kind                       | Supports phase distribution without React state          | Four opacity-switched variants cost extra draw nodes |
| One shared spin phase                                   | One animation instead of twelve                          | Candies cannot spin independently                    |
| Fixed preset difficulty                                 | Predictable per-selection pace without mid-match ramp    | Pace only changes when selecting a new difficulty    |
| Zustand for discrete state only                         | Selector subscriptions, no tree-wide re-renders          | Two sources of truth to keep straight                |
| `GameScreen` mounted for `'game'`, `'over'` and `'win'` | Replay without remount; result modal over a frozen scene | Screen state must gate the loop                      |
| UI-thread fire authorization                            | Double taps cannot spend one charge twice                | Store receives an asynchronous discrete event        |
| Staged terminal freeze before win transition            | Late collision cannot change win to over during defeat   | Win modal waits 2.5 s for the defeat animation       |
| AABB collision, X axis only                             | Cheapest test that is correct given lane checks          | Assumes sprites centred in lanes                     |
| Timestamp-based invulnerability                         | No timers to cancel or desynchronise                     | Depends on the monotonic game clock                  |
| Frame delta clamped to 50 ms                            | A background/resume pause cannot teleport the field      | Simulation slows during a long stall                 |
| Gameplay gestures scoped to the canvas                  | HUD/modal buttons cannot move the hero                   | HUD controls sit outside the gesture surface         |
| Geometry ported from the design HTML                    | Single source of truth for shapes                        | Changes must start in `docs/design/`                 |

---

## Where the frame rate goes

The POC's frame-rate criterion is unresolved: the last recorded run measured 30–50 fps on mid-range ARM with a much simpler scene, and that figure has not been re-measured. v0.0.4 draws 12 typed enemy slots, 8 confetti slots, enlarged projectiles, a 224 × 242 Barão, animated mouths, and milestone bursts, so the POC's result does not transfer automatically. **The v0.0.4 device measurement is still outstanding.** The acceptance gate is average ≥55 fps and minimum ≥50 fps when the v0.0.1 baseline meets those bars; otherwise the relative gate is p95 frame time no more than 10% above baseline, recorded with `dumpsys gfxinfo` or Metal System Trace.

The loop itself is O(12) over the fixed enemy pool with no allocation and is not the bottleneck. Cost is in the Skia render path.

Cheapest levers, in order:

1. Switch from the four-variant opacity tree to the approved typed sub-pool fallback — directly removes hidden variant draws
2. Increase the selected difficulty's fixed spawn interval — fewer simultaneous candies
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
