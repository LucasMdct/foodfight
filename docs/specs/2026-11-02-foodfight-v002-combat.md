# Spec: Food Fight v0.0.2 — Combat Loop

**Status:** Approved  
**Date:** 2026-11-02  
**Design sources:** [`FoodFight v0.0.2.dc.html`](../design/project/FoodFight%20v0.0.2.dc.html), [`Guia de Estilo v0.0.2.dc.html`](../design/project/Guia%20de%20Estilo%20v0.0.2.dc.html)

## Assumptions

1. v0.0.2 is an additive upgrade to the existing v0.0.1 Expo game; loading, selection, landscape lock, three heroes, three hero lives and lane movement remain.
2. The mobile `PODER!` button is the only production attack input. `SPACE` remains out of native scope; the browser preview may use it as a convenience.
3. v0.0.2 has no audio or music requirement. The supplied style guide explicitly moves sound and music to v0.0.3.
4. The current UI-thread frame-loop invariants remain mandatory: per-frame values stay in Reanimated shared values, and the worklet allocates nothing per frame.
5. The gameplay handoff is authoritative for inline geometry and numeric animation constants; the style guide is authoritative for player-facing rules and version boundaries. Where they disagree, this spec records the resolved value.
6. The v0.0.2 projectile renderer will use a fixed visual tree per pool slot: each slot mounts the four variants once and selects the active variant through shared-value opacity. This keeps type changes worklet-safe without relying on uncertain animated `SkPicture` switching.
7. Power firing is authorized on the UI thread. The JS button schedules a request; the worklet checks the charge mirror and free shot slot, activates the shot, decrements the mirror and sends one accepted-fire event back to JS.

If any assumption is wrong, update this spec before implementation begins.

## Review resolutions

The following decisions are closed for implementation:

- Native attack input is button-only. The power button fires on `onPressIn`; keyboard support is preview-only.
- The enemy hit by the hero is removed immediately and does not award dodge score.
- Attack type is selected per spawn, not by pool-slot index. The fixed visual tree uses opacity to select lollipop, gumdrop, donut or zombie.
- The phase-4 distribution is zombie 30%, gumdrop 25%, lollipop 25% and donut 20%. A second spawn has a 50% chance and uses the adjacent-lane formula from the gameplay handoff.
- Type speed multipliers apply to the current time-ramped speed: gumdrop `1.3×`, zombie `0.8×`, lollipop/donut `1×`.
- The villain movement uses the style-guide target of a 1.7-second full cycle. The `sin(elapsed / 850)` browser prototype expression is treated as a prototype timing discrepancy, not as the native runtime contract.
- The food bubble uses `0.55×` the current time-ramped speed, a 72px visual size and 14px collision padding. At most one bubble is active. Pending score thresholds produce bubbles one at a time; they do not create simultaneous bubbles. A pickup at 3 charges still shows the pickup toast but leaves charges at 3.
- A power shot always resolves as a hit when it reaches the villain's X target. Its vertical tracking is visual only.
- Gold power feedback uses a radial/opacity halo rather than an animated blur/drop-shadow.
- The adapter layer uses existing Vitest store tests plus a manual development checklist. Adding `jest-expo`, React Native Testing Library or Reanimated mocks is out of scope unless separately approved.
- The zombie laugh is rendered inside Skia with `useFont` and the existing Fredoka TTF package, so it respects canvas layer order without adding ten animated React Native text overlays.

One visual dependency remains blocked: the design bundle has rules for the Barão `bravo` face but no source geometry. The mood must be added to the design source before the renderer is ported; production code must not invent a reverse-engineered face without that handoff update.

## Objective

Turn the v0.0.1 endless runner into the first combat loop. The player still dodges incoming sweets, but can collect real food to charge a hero power and fire that power at the moving Barão Brigadeiro. Five villain HP must be removed to reach the victory screen; losing the hero's three lives reaches the defeat screen.

The feature is successful when the combat loop is playable, visually matches the v0.0.2 handoff, preserves the frame-budget architecture, and is covered by deterministic scenarios before device QA.

## User-visible behavior

### Combat state

- The Barão Brigadeiro has 5 purple HP markers.
- The villain moves vertically through the three-lane playfield in a smooth sine-like path with a 1.7-second full cycle.
- The villain uses an expressive `feliz` mood while attacking and `bravo` for 1.2 seconds after being hit.
- The hero keeps 3 heart lives.
- The existing dodge score remains +10 for each projectile that exits the left side.
- The scene freezes when the run reaches `over` or `win`.

### Attack phases

The current attack is derived from the score and is shown below the villain HP. It does not become an independent per-frame React state value.

| Score | Attack | Projectile behavior |
|---:|---|---|
| 0–99 | Pirulito Espiral | 1× current ramped speed; spinning lollipop |
| 100–199 | Bala Veloz | 1.3× current ramped speed; spinning gumdrop |
| 200–299 | Rosquinha Voadora | 1× current ramped speed; slow-spinning donut |
| 300–399 | Brigadeiro Zumbi | 0.8× current ramped speed; 76px zombie projectile with wobble and “HA HA!” |
| 400+ | Chuva de Açúcar | Mixed projectile types using the phase-4 distribution; 50% chance of a second projectile on a different lane |

The existing time-based speed ramp remains active. Attack phase changes the projectile type and phase-specific speed multiplier; it does not replace the time ramp.

### Food bubble and powers

- Once the score reaches each 300-point threshold and no bubble is active, one food bubble can spawn. If multiple thresholds are crossed while a bubble is active, the next threshold is consumed only after the active bubble is collected or leaves the field.
- The bubble contains rice and beans, moves toward the hero at 0.55× the current projectile speed, and spawns in a random lane.
- Collecting it adds one power charge, capped at 3, and shows `Comida de verdade! +1 PODER` for 1.4 seconds even when the charge cap prevents the numeric value from increasing.
- The `PODER!` button is disabled-looking when no charge is available and pulses when at least one charge is available. It fires on `onPressIn`.
- A button press only schedules a fire request. The UI-thread worklet validates a mirrored charge count and a free power-shot slot, then atomically activates the shot and decrements the mirror. Only an accepted fire sends an event to JS.
- An accepted fire consumes one charge in Zustand and uses the next power name for the selected hero in a three-item rotation. The rotation index is engine-local/shared and resets on replay; it is not Zustand UI state.
- A power shot uses a fixed pool of 3 slots, moves right at 620 px/s, softly tracks the villain's vertical position, and removes 1 villain HP on arrival.
- Each shot shows a gold glow and a toast containing the selected power name for 1.4 seconds.

Power names:

| Hero | Rotation |
|---|---|
| Alface | Folha Bumerangue → Furacão Verde → Muralha de Salada |
| Feijão | Meteoro Carioca → Rajada de Feijão → Escudo de Caldo |
| Arroz | Grão Turbo → Chuva de Arroz → Broto Explosivo |

Power differences are narrative and visual only in v0.0.2. Mechanical differentiation is reserved for v0.0.3.

### Result screens

- `VOCÊ VENCEU!` appears when villain HP reaches zero, sets villain mood to `bravo`, updates best score, and shows the selected hero, final score, best score and actions to replay or switch hero.
- `Doce demais!` remains the defeat copy, with final score, best score and the same actions.
- Replay resets villain HP, charges, projectiles, bubble, mood, score, lives, difficulty, power rotation, toast timers and all UI-thread mirrors while preserving hero selection and best score.

## Tech stack and commands

The feature stays on the existing stack:

- Expo SDK 56 (`expo ~56.0.14`)
- React Native 0.85
- React Native Skia 2.6.2
- Reanimated 4.3.1 and Worklets
- Zustand 5
- TypeScript 6
- Vitest 5 for RN-free deterministic tests

Commands:

```bash
npm install
npm run typecheck
npm run lint
npm test
npx expo start
npx expo run:android --variant release
```

The Expo v56 versioned documentation must be checked before writing or changing native/runtime code.

## Project structure

Planned additions and changes:

```text
docs/
├── design/project/
│   ├── FoodFight v0.0.2.dc.html       # imported gameplay handoff
│   └── Guia de Estilo v0.0.2.dc.html  # imported visual handoff
├── specs/2026-11-02-foodfight-v002-combat.md
└── plans/2026-11-02-foodfight-v002-combat.md

src/
├── engine/
│   ├── math.ts                         # existing pure formulas
│   ├── combatMath.ts                   # phase, speed, hit and threshold formulas
│   ├── combatSimulation.ts             # RN-free deterministic harness core
│   └── *.test.ts                       # deterministic scenario coverage
├── hooks/useRunnerEngine.ts            # expanded fixed-pool UI-thread loop
├── render/
│   ├── candies/Candy.tsx               # existing sweets + zombie variant
│   ├── combat/FoodBubble.tsx            # food collectible vector
│   ├── combat/PowerShot.tsx             # hero power projectile vector
│   └── combat/ZombieLaugh.tsx            # Skia text label for zombie projectiles
├── hud/Hud.tsx                         # hero, villain HP, score, charges, power button
├── features/game/GameScreen.tsx        # combat scene and fixed pools
├── features/game-over/GameOverModal.tsx # defeat and victory variants
└── render/foodie/characters/Vilao.tsx  # `feliz` and `bravo` expressions
```

The exact file split can change in the implementation plan, but gameplay state must not move into React state on every frame.

## Architecture

### Discrete state in Zustand

Extend `GameState` with only values that React renders at discrete frequency:

```ts
type Screen = 'select' | 'game' | 'over' | 'win';
type VillainMood = 'feliz' | 'bravo';

interface GameState {
  screen: Screen;
  who: Who;
  lives: number;
  score: number;
  best: number;
  fps: number;
  villainHp: number;
  charges: number;
  villainMood: VillainMood;
  toast: string;
  toastId: number;
}
```

`powerIndex` is a shared value on the UI thread. It advances only when the worklet accepts a shot and the accepted-fire event carries the numeric index to JS; JS resolves the hero-specific power name. No power-name string crosses the worklet boundary. `toastId` is a discrete nonce so repeated names still restart the toast animation.

Per-frame positions and active flags remain shared values: villain Y, obstacle X/Y/active/type, shot X/Y/active, bubble X/Y/active, elapsed clock, the UI-thread score mirror, the UI-thread villain-HP mirror, the UI-thread charge mirror, the `nextBubbleAt` threshold and a local freeze flag armed by the worklet itself.

The store actions `hitHero`, `applyFoodCollected`, `applyPowerFired` and `hitVillain` must guard `screen === 'game'`. The local freeze flag is armed before the corresponding UI→JS event is sent, so a late event cannot turn `win` into `over` or consume another charge.

### Fixed pools

- Villain projectiles: 10 slots, matching the v0.0.2 design handoff. Each slot carries a shared-value type/kind and size; its four visual variants are mounted once and switched by opacity.
- Power shots: 3 slots.
- Food bubble: 1 slot.
- No conditional mounting, object creation or array allocation inside `useFrameCallback`.
- A slot is activated by mutating shared values and recycled by setting its active value to zero.

### Bridges to React

Bridges are split by direction and are discrete:

UI thread → JS:

- `applyScore(+10)` once per projectile that leaves the screen.
- `applyHeroHit()` once per invulnerability window.
- `applyFoodCollected()` once per bubble pickup.
- `applyPowerFired(powerIndex)` once per accepted fire; JS consumes the corresponding store charge, resolves the name and advances the toast nonce.
- `applyVillainHit()` once per power shot arrival.
- `applyFps()` once per second.

JS → UI thread:

- `requestFirePower()` from the button; the UI thread performs the charge/slot check.
- `reset()` when a new match starts.

No bridge may be called for villain position, projectile position, shot position, bubble position or attack phase on every frame. The exact Reanimated 4.3.1 scheduling API must be verified against the Expo v56-compatible documentation before implementation; do not add a new dependency for this bridge.

## Code style

Pure formulas stay RN-free and worklet-safe:

```ts
export const attackPhaseAt = (score: number): number => {
  'worklet';
  return Math.min(
    GAME_CONSTANTS.ATTACK_PHASE_MAX,
    Math.floor(score / GAME_CONSTANTS.ATTACK_PHASE_SCORE_STEP)
  );
};

export const powerChargeAfterPickup = (charges: number): number => {
  'worklet';
  return Math.min(GAME_CONSTANTS.POWER_MAX_CHARGES, charges + 1);
};
```

Use named constants from `GAME_CONSTANTS`, typed unions for finite gameplay states, fixed-size pools, a seeded allocation-free PRNG shared by production formulas and the headless harness, and comments that explain performance constraints. New colors must come from `src/theme/tokens.ts`; new vector geometry must be ported from the v0.0.2 design handoff.

The constants table must include at least:

| Constant | Default | Purpose |
|---|---:|---|
| `VILLAIN_HP` | 5 | Starting Barão HP |
| `POWER_MAX_CHARGES` | 3 | Charge cap |
| `BUBBLE_EVERY` | 300 | Score threshold |
| `POWER_SHOT_SPEED` | 620 | Power-shot px/s |
| `ATTACK_PHASE_SCORE_STEP` | 100 | Score interval between attack phases |
| `ATTACK_PHASE_MAX` | 4 | Highest phase index |
| `VILLAIN_CYCLE_MS` | 1700 | Full vertical movement cycle |
| `VILLAIN_AMPLITUDE_RATIO` | 0.31 | Target movement amplitude, clamped by viewport margins |
| `ENEMY_POOL_SIZE` | 10 | Fixed enemy pool |
| `POWER_SHOT_POOL_SIZE` | 3 | Fixed shot pool |
| `BUBBLE_SIZE` | 72 | Bubble visual/hitbox basis |
| `ZOMBIE_SIZE` | 76 | Zombie hitbox basis |
| `ENEMY_SPAWN_X_OFFSET` | 90 | Spawn position beyond the right edge |
| `ENEMY_DESPAWN_X` | -100 | Recycle threshold |
| `BUBBLE_HITBOX_PADDING` | 14 | Bubble collection inset |
| `ZOMBIE_RENDER_WIDTH` | 80 | Literal handoff SVG width |
| `ZOMBIE_RENDER_HEIGHT` | 74 | Literal handoff SVG height |

The zombie SVG geometry remains literal at 80×74, but its container is centered in the target lane rather than copying the prototype's `left:-14px; top:-30px` placement. The gameplay hitbox is an explicit 76×76 rectangle centered on the lane. This intentionally fixes the prototype's vertical offset while preserving the guide's “nearly fills the lane” intent. The villain amplitude is clamped so the 142px visual remains inside the playfield with a small margin on short landscape viewports.

## Assets and design handoff

### Imported sources

- `docs/design/project/FoodFight v0.0.2.dc.html` — screen layout, gameplay markup, inline vectors and reference loop.
- `docs/design/project/Guia de Estilo v0.0.2.dc.html` — rules for combat behavior, colors, power names, attacks and v0.0.2/v0.0.3 boundaries.
- `docs/design/project/Foodie.dc.html` — existing character geometry source; no new raster character asset is required.

### Assets required for implementation

| Asset | Source/format | Implementation action |
|---|---|---|
| Barão feliz/bravo | Feliz geometry exists; bravo geometry is missing from the design bundle | Add the bravo face to the design source first, then extend `Vilao.tsx` with a mood prop |
| Brigadeiro Zumbi | Inline SVG in v0.0.2 handoff | Port to a fixed Skia renderer |
| Food bubble | Inline SVG in v0.0.2 handoff | Port rice/beans bubble to Skia |
| Three hero power visuals | Inline SVG in v0.0.2 handoff | Port one fixed renderer per hero; the three names rotate without mechanical differences in v0.0.2 |
| Villain HP markers | Inline SVG in handoff | Add reusable HUD marker |
| Charge dots and `PODER!` button | Style guide tokens | Add to HUD; no image file required |
| Victory/defeat visuals | Existing Foodie geometry + inline layout | Add result-modal variant; no raster file required |
| Zombie laugh label | Inline `HA HA!` in the gameplay handoff | Load `Fredoka_700Bold.ttf` once in `GameScreen`, pass the font to fixed zombie slots and render inside Skia; handle the initial `null` font without conditional mounting |
| Power glow | Style guide glow rule | Use an opacity-animated radial/halo approximation; no animated blur |
| Audio/music | Not required for v0.0.2 | Defer to v0.0.3 |

No files from the Downloads `audio/` or `uploads/` folders are part of this feature's acceptance scope.

## Testing strategy

### Headless deterministic harness

The harness is the main regression layer. It should accept a fixed initial state, a seeded RNG, fixed frame timestamps and a sequence of lane/power inputs, then return discrete events and a final snapshot. It must compose the same RN-free worklet-safe formulas used by production; it must not become a second hand-written game loop with different rules.

Minimum scenarios:

- `attack-phase-boundaries`: 0/99/100/199/200/299/300/399/400 score thresholds.
- `zombie-hitbox`: 76px zombie collision and recycling.
- `sugar-rain`: seeded 50% double-spawn branch.
- `pool-saturation`: counts skipped spawns in a wide-field worst case, including the second sugar-rain spawn.
- `double-fire-single-charge`: two fire requests with one mirrored charge activate at most one shot and decrement one charge.
- `food-bubble-threshold`: one bubble per 300-point threshold, no duplicate threshold spawn.
- `charge-cap`: pickups stop at 3 charges.
- `power-rotation`: three hero-specific names rotate and then wrap.
- `power-shot-hit`: shot tracks villain and removes exactly 1 HP.
- `victory-freeze`: HP zero changes screen to `win` and freezes the simulation.
- `defeat-freeze`: three hero hits change screen to `over` and freeze the simulation.
- `win-then-hit-race`: a villain hit cannot be followed by a hero hit after the worklet has armed its local freeze.
- `bubble-at-full-charges`: pickup feedback appears but charges remain capped at 3.
- `reset-replay`: reset returns all combat pools and counters to their initial values.

### Adapter/integration checks

Verify shared values, fixed pool mounting, Zustand event bridges, modal transitions and AppState pause/resume through store tests and a manual development checklist. Do not add a new adapter testing dependency in v0.0.2. The checklist must verify that the canvas subtree is memoized and that score/HP/charge/toast subscriptions live in leaf HUD components rather than forcing the whole `GameScreen` to re-render.

### Device checks

On a physical release build, first record the v0.0.1 baseline with the platform profiler (`adb shell dumpsys gfxinfo` on Android or Metal System Trace on iOS), not the development `LOOP` readout. Then verify the visual handoff, touch lane changes, `onPressIn` power-button latency, memory stability, zombie rendering, victory/defeat overlays, background/resume behavior, 120Hz behavior, multitouch (swipe plus power button) and the phase-4 worst case. A dev-only QA shortcut may start a run at a chosen score/charge count; it must be unavailable in release builds. The existing v0.0.1 protocol remains the base and gains a v0.0.2 combat section.

The performance gate is measurable: when the v0.0.1 baseline meets the existing `testing.md` targets, v0.0.2 must also meet them and must not increase p95 frame time by more than 10% on the same physical device, OS, display refresh rate and release build. If the v0.0.1 baseline itself misses ≥55 average or ≥50 minimum, the absolute target is recorded as an unresolved baseline finding in `docs/results.md`; v0.0.2 is judged by the relative p95 limit and zero new crashes. If the fixed four-variant visual tree fails this gate, the approved fallback is typed sub-pools (option B), followed by another profiler measurement.

## Boundaries

- **Always:** read `docs/architecture.md` before loop changes; follow the imported v0.0.2 handoff for visuals; keep per-frame values out of React; keep pools fixed; use named constants; share pure formulas between production and harness; run typecheck, lint and tests; update the changelog for user-visible behavior.
- **Ask first:** adding runtime or test dependencies; adding audio; changing the game orientation; changing the v0.0.1 scoring/lives model; changing the fixed-pool strategy; changing the existing character geometry; approving an invented `bravo` face without a design-source update.
- **Never:** copy the browser prototype's `requestAnimationFrame` state model into React Native; allocate objects/arrays in the frame worklet; move positions into Zustand; delete or weaken existing tests; use the archived docs as source of truth.

## Success criteria

- [ ] The app reaches the existing select screen and starts a v0.0.2 combat run without regressions to v0.0.1 lane movement.
- [ ] The villain moves vertically on a 1.7-second full cycle and renders `feliz`/`bravo` states according to the updated design source.
- [ ] The five attack phases appear at their exact score boundaries and their projectile behaviors match the table.
- [ ] The game renders a 10-slot enemy pool with per-spawn types, a 3-slot power-shot pool and a 1-slot food bubble without per-frame allocation.
- [ ] Food bubbles appear every 300 points, can be collected, and cap charges at 3.
- [ ] The button consumes charges, rotates the correct hero power names, launches a tracking shot and removes one villain HP.
- [ ] Five successful power hits reach the victory modal; three hero hits reach the defeat modal.
- [ ] Both result screens support replay and hero switching; replay resets all v0.0.2 state and preserves best score.
- [ ] Headless scenarios cover phase boundaries, pools, pool saturation, pickups, power rotation, victory, defeat, victory/defeat races and reset.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass.
- [ ] Device QA records the new v0.0.2 combat checks and does not violate the existing frame-rate invariants.
- [ ] `docs/architecture.md` is updated to describe the v0.0.2 pools, mirrors, freeze behavior, villain motion, projectile typing and bridge count.
- [ ] `docs/testing.md` contains the v0.0.2 combat protocol, performance gate, dev-only QA shortcut and multitouch/device checks.
- [ ] `CHANGELOG.md` records the user-visible v0.0.2 combat feature under `[Unreleased]`.

## Blocking design dependency

The only unresolved input to the final visual implementation is the source geometry for the Barão `bravo` expression. Add a design-source amendment under `docs/design/project/` before porting the final `Vilao.tsx` face. The `mood` prop, timers, state transitions and a temporary `feliz` fallback may be implemented earlier, but the final `bravo` geometry must come from the design source under `AGENTS.md`.
