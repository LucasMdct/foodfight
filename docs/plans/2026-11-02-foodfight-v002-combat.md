# Food Fight v0.0.2 Combat Loop Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with a fresh verification checkpoint after every task. Do not begin a task until its predecessor's tests and typecheck are green.

**Goal:** Add the v0.0.2 combat loop to the existing Food Fight runner: moving Barão, typed attack phases, food bubbles, hero powers, victory/defeat, deterministic harness coverage and device performance gates.

**Architecture:** Keep the gameplay frame loop in `useRunnerEngine.ts` on the Reanimated UI thread. Add RN-free combat formulas and a deterministic simulation harness that compose the same formulas as production. Store only discrete HUD/result values in Zustand; keep all positions, pool flags, mirrors, RNG state and freeze gates in shared values.

**Tech Stack:** Expo SDK 56, React Native 0.85, React Native Skia 2.6.2, Reanimated 4.3.1, Worklets, Zustand 5, TypeScript 6, Vitest 5.

## Global Constraints

- Read `docs/architecture.md` and the Expo SDK 56 versioned documentation before changing runtime/native code.
- Per-frame positions never enter React state or Zustand.
- The frame worklet allocates no objects or arrays per frame.
- Enemy pool size is 10, power-shot pool size is 3 and food-bubble pool size is 1.
- The UI thread authorizes power firing using a mirrored charge count and a free-shot check; JS only receives an accepted-fire event.
- Native attack input is the `PODER!` button on `onPressIn`; keyboard `SPACE` is preview-only.
- The primary renderer is option A: four fixed variants per enemy slot selected with shared-value opacity. Typed sub-pools are the approved fallback if the profiler gate fails.
- Power-shot visuals are one fixed visual per hero; named powers rotate narratively in v0.0.2 and gain mechanical differences in v0.0.3.
- Use existing Fredoka TTF assets with Skia `useFont` for the zombie `HA HA!`; load once in `GameScreen`, pass to fixed slots and tolerate `null` without conditional mounting.
- New geometry starts in `docs/design/project/`; do not invent the final Barão `bravo` face in production code.
- Do not add runtime or test dependencies without approval.
- Every user-visible change updates `CHANGELOG.md` under `[Unreleased]`.

---

## File map

| Area | Files | Responsibility |
|---|---|---|
| Constants/types | `src/types/constants.ts`, `src/types/game.ts` | Combat constants, screen/mood/kind unions, discrete state/actions |
| Pure engine | `src/engine/combatMath.ts`, `src/engine/combatMath.test.ts` | Attack phases, type distribution, speed, thresholds, hitboxes, seeded RNG |
| Harness | `src/engine/combatSimulation.ts`, `src/engine/combatSimulation.test.ts` | Deterministic event/snapshot runner composed from pure formulas |
| Store | `src/store/gameStore.ts`, `src/store/gameStore.test.ts` | Guarded discrete transitions and result state |
| UI-thread engine | `src/hooks/useRunnerEngine.ts` | Fixed pools, shared mirrors, local freeze, bridges |
| Render | `src/render/candies/Candy.tsx`, `src/render/combat/*`, `src/render/foodie/characters/Vilao.tsx` | Static Skia tree, zombie, bubble, power shot, mood |
| UI | `src/hud/Hud.tsx`, `src/features/game/GameScreen.tsx`, `src/features/game-over/GameOverModal.tsx` | Leaf subscriptions, combat controls, victory/defeat states |
| Docs | `docs/architecture.md`, `docs/testing.md`, `docs/results.md`, `CHANGELOG.md` | Current architecture, QA protocol, baseline result and release notes |

## Task 0: Establish baseline and resolve the design-source gate

**Files:**

- Read: `AGENTS.md`, `docs/architecture.md`, `docs/testing.md`, `docs/specs/2026-11-02-foodfight-v002-combat.md`
- Design: `docs/design/project/FoodFight v0.0.2.dc.html`, `docs/design/project/Guia de Estilo v0.0.2.dc.html`, `docs/design/project/Foodie.dc.html`
- Modify only if the design amendment is available: `docs/design/project/Foodie.dc.html`
- Record if a device is available: `docs/results.md`

**Interfaces:**

- Produces a v0.0.1 baseline with device model, OS, refresh rate, build type, p50/p95/p99 frame time and dropped frames.
- Produces either the approved `bravo` geometry source or an explicit temporary `feliz` fallback decision while the mood prop/state plumbing proceeds.

- [ ] **Step 1: Verify the installed Expo/Reanimated APIs**

Read the official Expo v56 docs and the installed Reanimated 4.3.1/Skia type declarations for UI scheduling, shared values, `useFont`, Skia `Text` and `TextPath`. Record the selected API names in the plan notes before changing code.

- [ ] **Step 2: Run the existing static checks**

Run:

```bash
npm install
npm run typecheck
npm run lint
npm test
```

Expected: all commands pass. If `vitest` is unavailable after `npm install`, repair the dependency installation before feature work; do not skip tests.

- [ ] **Step 3: Record the v0.0.1 device baseline**

Use a release build and platform profiler, not the `LOOP` readout:

```bash
npx expo run:android --variant release
adb shell dumpsys gfxinfo <package>
```

On iOS, use Metal System Trace. If no physical device is available, record that the absolute baseline is unresolved in `docs/results.md`; the v0.0.2 relative p95 gate still remains required.

- [ ] **Step 4: Commit the baseline/design-source preparation**

```bash
git add docs/results.md docs/design/project/Foodie.dc.html
git commit -m "docs: record v0.0.1 combat baseline"
```

Only commit files that changed in this task.

## Task 1: Add constants, typed projectile kinds and pure combat formulas

**Files:**

- Modify: `src/types/constants.ts`
- Create: `src/engine/combatMath.ts`
- Create: `src/engine/combatMath.test.ts`

**Interfaces:**

- Produces `ProjectileKind = 0 | 1 | 2 | 3` with named constants for lollipop, gumdrop, donut and zombie.
- Produces worklet-safe functions:

```ts
attackPhaseAt(score: number): number;
projectileKindAt(phase: number, random01: number): ProjectileKind;
projectileSpeedMultiplier(kind: ProjectileKind): number;
nextRngState(state: number): number;
rngUnit(state: number): number;
villainYAt(elapsedMs: number, height: number): number;
powerChargeAfterPickup(charges: number): number;
rectsOverlapWithPadding(...): boolean;
```

- Adds named constants from the approved spec: `VILLAIN_HP`, `POWER_MAX_CHARGES`, `BUBBLE_EVERY`, `POWER_SHOT_SPEED`, `ATTACK_PHASE_SCORE_STEP`, `ATTACK_PHASE_MAX`, `VILLAIN_CYCLE_MS`, `VILLAIN_AMPLITUDE_RATIO`, `ENEMY_POOL_SIZE`, `POWER_SHOT_POOL_SIZE`, `BUBBLE_SIZE`, `ZOMBIE_SIZE`, `ZOMBIE_RENDER_WIDTH`, `ZOMBIE_RENDER_HEIGHT`, `ENEMY_SPAWN_X_OFFSET`, `ENEMY_DESPAWN_X` and `BUBBLE_HITBOX_PADDING`.

- [ ] **Step 1: Write failing formula tests**

Cover exact boundaries: scores `0, 99, 100, 199, 200, 299, 300, 399, 400`; multipliers `1`, `1.3`, `0.8`; phase-4 distribution intervals; deterministic RNG; 1.7-second villain cycle; bubble cap; zombie 76px centered hitbox; spawn `width + 90` and despawn at `-100`.

- [ ] **Step 2: Run the focused test file**

```bash
npx vitest run src/engine/combatMath.test.ts
```

Expected: FAIL because the module and formulas do not exist.

- [ ] **Step 3: Implement the minimal pure formulas**

Keep formulas numeric and allocation-free. The phase-4 selector must use the seeded random value, with intervals `[0, .30) zombie`, `[.30, .55) gumdrop`, `[.55, .80) lollipop`, `[.80, 1) donut`.

- [ ] **Step 4: Run focused tests and typecheck**

```bash
npx vitest run src/engine/combatMath.test.ts
npm run typecheck
```

Expected: PASS and clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/types/constants.ts src/engine/combatMath.ts src/engine/combatMath.test.ts
git commit -m "feat: add v0.0.2 combat formulas"
```

## Task 2: Build the deterministic headless harness

**Files:**

- Create: `src/engine/combatSimulation.ts`
- Create: `src/engine/combatSimulation.test.ts`
- Consume: `src/engine/combatMath.ts`, `src/types/constants.ts`

**Interfaces:**

```ts
export interface CombatScenario {
  seed: number;
  score?: number;
  villainHp?: number;
  charges?: number;
  lives?: number;
  frames: readonly { dtMs: number; lane?: number; fire?: boolean }[];
}

export interface CombatEvent {
  type: 'score' | 'heroHit' | 'foodCollected' | 'powerFired' | 'villainHit' | 'win' | 'over' | 'spawnSkipped';
  value?: number;
}

export interface CombatSnapshot {
  screen: 'game' | 'win' | 'over';
  score: number;
  villainHp: number;
  charges: number;
  lives: number;
  activeEnemies: number;
  activeShots: number;
}

export function runCombatScenario(input: CombatScenario): {
  events: CombatEvent[];
  snapshot: CombatSnapshot;
};
```

- [ ] **Step 1: Write failing scenarios**

Add `attack-phase-boundaries`, `sugar-rain`, `pool-saturation`, `food-bubble-threshold`, `charge-cap`, `double-fire-single-charge`, `power-rotation`, `power-shot-hit`, `victory-freeze`, `defeat-freeze`, `win-then-hit-race`, `bubble-at-full-charges` and `reset-replay`.

- [ ] **Step 2: Run focused tests and verify failure**

```bash
npx vitest run src/engine/combatSimulation.test.ts
```

Expected: FAIL because the scenario runner does not exist.

- [ ] **Step 3: Implement a fixed-state scenario runner**

Use fixed arrays and numeric fields. Compose `attackPhaseAt`, `projectileKindAt`, `projectileSpeedMultiplier`, RNG and hitbox formulas from Task 1. Do not copy the production hook or create a second set of formulas.

- [ ] **Step 4: Run harness tests**

```bash
npx vitest run src/engine/combatMath.test.ts src/engine/combatSimulation.test.ts
```

Expected: PASS with deterministic event order and snapshots.

- [ ] **Step 5: Commit**

```bash
git add src/engine/combatSimulation.ts src/engine/combatSimulation.test.ts
git commit -m "test: add deterministic combat harness"
```

## Task 3: Extend game types and guarded Zustand transitions

**Files:**

- Modify: `src/types/game.ts`
- Modify: `src/store/gameStore.ts`
- Create: `src/store/gameStore.test.ts`

**Interfaces:**

- `Screen` becomes `'select' | 'game' | 'over' | 'win'`.
- `VillainMood` becomes `'feliz' | 'bravo'`.
- `GameState` gains `villainHp`, `charges`, `villainMood`, `toast`, `toastId`.
- Actions gain `applyFoodCollected`, `applyPowerFired(powerIndex)`, `hitVillain` and guarded result transitions.

- [ ] **Step 1: Write store tests first**

Assert: `start` initializes combat; `applyFoodCollected` caps at 3; `applyPowerFired` does nothing outside `game` and consumes one charge inside `game`; `hitVillain` decrements HP and sets `win`/`best`; `hitHero` cannot change `win` to `over`; `reset` clears combat state and preserves `who`/`best`; repeated toast names increment `toastId`.

- [ ] **Step 2: Run store tests to verify failure**

```bash
npx vitest run src/store/gameStore.test.ts
```

Expected: FAIL against the v0.0.1 state/actions.

- [ ] **Step 3: Implement the guarded state transitions**

Keep the store RN-free. Every combat action must return the existing state unchanged when `screen !== 'game'`, except explicit `reset`, `start` and `toSelect` actions.

- [ ] **Step 4: Run store tests and full typecheck**

```bash
npx vitest run src/store/gameStore.test.ts
npm run typecheck
```

Expected: PASS and clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: add guarded combat game state"
```

## Task 4: Extend the UI-thread engine with combat mirrors and fixed pools

**Files:**

- Modify: `src/hooks/useRunnerEngine.ts`
- Modify: `src/engine/combatMath.ts` only if a focused formula gap is found
- Test: `src/engine/combatSimulation.test.ts` for behavior that can remain RN-free

**Interfaces:**

Extend `RunnerEngine` with:

```ts
villainY: SharedValue<number>;
villainMood: SharedValue<number>;
obstacleKind: SharedValue<number>[];
shotX: SharedValue<number>[];
shotY: SharedValue<number>[];
shotActive: SharedValue<number>[];
bubbleX: SharedValue<number>;
bubbleLane: SharedValue<number>;
bubbleActive: SharedValue<number>;
requestFirePower: () => void;
```

- [ ] **Step 1: Add shared values and reset coverage**

Create the 10 enemy slots, 3 shot slots and 1 bubble slot once. Add shared mirrors for score, villain HP, charges, `nextBubbleAt`, `powerIndex`, RNG state and the local freeze flag. Reset every slot/mirror/counter in `reset()`.

- [ ] **Step 2: Add UI-thread fire authorization**

`requestFirePower()` schedules a UI-thread worklet. The worklet returns immediately when frozen, charge mirror is zero or every shot slot is active. On acceptance it decrements the charge mirror, activates one shot and advances the shared `powerIndex`; only then does it call `applyPowerFired(powerIndex)` on JS.

- [ ] **Step 3: Replace fixed slot-type derivation**

On spawn, advance the seeded RNG and write the numeric kind shared value. Phase 4 uses the approved distribution and 50% second-lane spawn. The hit path deactivates the enemy without score; the off-screen path deactivates and applies +10.

- [ ] **Step 4: Add villain, bubble and shot simulation**

Update villain Y from the clamped 1.7-second formula. Spawn bubbles on sequential pending thresholds. Move bubbles at 0.55× ramp speed and collect using the 72px/14px hitbox. Move shots at 620 px/s toward the villain Y, resolve hit by X arrival, decrement villain HP and arm local freeze on win.

- [ ] **Step 5: Add local freeze and race guards**

Arm freeze before `applyVillainHit` or `applyHeroHit` crosses to JS. Gate all spawn/movement/collection/hit logic on the local flag. Keep the existing AppState pause and delta clamp behavior.

- [ ] **Step 6: Run focused validation**

```bash
npx vitest run src/engine/combatMath.test.ts src/engine/combatSimulation.test.ts src/store/gameStore.test.ts
npm run typecheck
```

Expected: PASS and clean typecheck. Do not claim device performance yet.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useRunnerEngine.ts src/engine/combatMath.ts src/engine/combatSimulation.test.ts
git commit -m "feat: extend runner engine for combat"
```

## Task 5: Port combat visuals from the v0.0.2 handoff

**Files:**

- Modify: `src/render/candies/Candy.tsx`
- Create: `src/render/combat/ZombieCandy.tsx`
- Create: `src/render/combat/FoodBubble.tsx`
- Create: `src/render/combat/PowerShot.tsx`
- Create: `src/render/combat/ZombieLaugh.tsx`
- Modify: `src/theme/tokens.ts`
- Modify: `src/render/foodie/characters/Vilao.tsx` only after the design-source mood amendment exists

**Interfaces:**

- `Candy` accepts a numeric/shared kind and renders fixed variants using shared opacity.
- `FoodBubble` consumes `x`, `lane`, `active` shared values.
- `PowerShot` consumes `x`, `y`, `active`, hero kind and one shared font/halo phase.
- `ZombieLaugh` consumes the same `x`, `y`, `active`, kind and `SkFont | null`; it mounts once per enemy slot and renders nothing visually while the font is null without changing the tree shape.

- [ ] **Step 1: Add pure visual/token tests where possible**

Keep geometry validation in the design handoff and use TypeScript checks for component prop contracts. Do not snapshot the entire Skia tree as a substitute for device validation.

- [ ] **Step 2: Load Fredoka once**

In `GameScreen`, call `useFont(Fredoka_700Bold, fontSize)` once. Pass the result to all fixed zombie laugh slots. Measure text width once per mount or use a fixed label width; never measure in the frame callback.

- [ ] **Step 3: Port the inline vectors**

Port the zombie SVG at literal 80×74 geometry, center its container in the lane, use the explicit 76×76 centered hitbox contract, port the bubble and one power visual per hero, and use an opacity halo instead of blur.

- [ ] **Step 4: Add mood plumbing without inventing bravo geometry**

Add the `mood` prop/timer/state path. Until the design-source amendment lands, render the existing `feliz` geometry as a temporary fallback and mark the visual QA item unresolved. Once the amendment exists, port it verbatim.

- [ ] **Step 5: Run typecheck and lint**

```bash
npm run typecheck
npm run lint
```

Expected: PASS. Verify no new per-frame allocation appears in the engine or render helpers.

- [ ] **Step 6: Commit**

```bash
git add src/render/candies/Candy.tsx src/render/combat src/theme/tokens.ts src/render/foodie/characters/Vilao.tsx
git commit -m "feat: add v0.0.2 combat visuals"
```

## Task 6: Integrate HUD, power control and result screens

**Files:**

- Modify: `src/hud/Hud.tsx`
- Modify: `src/hud/Hud.styles.ts`
- Modify: `src/features/game/GameScreen.tsx`
- Modify: `src/features/game-over/GameOverModal.tsx`
- Modify: `src/features/game-over/GameOverModal.styles.ts`

**Interfaces:**

- HUD leaf components subscribe independently to villain HP, score, charges, toast and hero lives.
- The canvas subtree is memoized and does not subscribe to score/HP/charge/toast.
- `PODER!` uses `onPressIn={engine.requestFirePower}` and remains outside `SwipeHandler`.
- Result modal renders the `over` and `win` variants, preserving replay/switch-hero actions.

- [ ] **Step 1: Add HUD interaction tests/checks**

Cover accessibility labels, disabled-looking no-charge state, `onPressIn`, three charge dots, five villain markers, mobile hint text without `SPACE`, and separate win/defeat copy.

- [ ] **Step 2: Move subscriptions to leaves**

Keep `GameScreen` subscribed only to screen/hero values needed to choose the scene. Put score, lives, villain HP, charges and toast selectors in `Hud`/leaf components.

- [ ] **Step 3: Add fixed render pools to the Canvas**

Mount all 10 enemy slots, all 3 power-shot slots, the bubble and zombie labels once. Render in back-to-front order: tablecloth, lanes, villain, enemies/bubble, power shots, hero, HUD overlays.

- [ ] **Step 4: Add win/defeat result behavior**

Use the store's guarded `win`/`over` state. Replay calls `reset()` then `start()`; switch hero calls `toSelect()`. Verify the local engine freeze remains armed while the modal is visible.

- [ ] **Step 5: Run checks**

```bash
npm run typecheck
npm run lint
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hud src/features/game src/features/game-over
git commit -m "feat: add combat HUD and result screens"
```

## Task 7: Update architecture, QA protocol and release documentation

**Files:**

- Modify: `docs/architecture.md`
- Modify: `docs/testing.md`
- Modify: `docs/results.md` if the baseline or device findings changed
- Modify: `CHANGELOG.md`
- Modify: `docs/README.md` to link the completed plan

**Interfaces:**

- Documentation describes the code that now exists, not the intended prototype.
- Architecture records pools, mirrors, local freeze, villain motion, per-spawn kinds, font loading and bridge directions.
- Testing adds v0.0.2 combat phases, seed/QA shortcut, double-fire, multitouch, 120Hz and profiler gates.

- [ ] **Step 1: Read the final implementation**

Re-read `src/hooks/useRunnerEngine.ts`, `src/features/game/GameScreen.tsx`, store/types and render components before documenting behavior.

- [ ] **Step 2: Update architecture**

Remove stale v0.0.1 claims: pool size 8, slot type by index, exactly three `runOnJS` calls, screens limited to `game/over` and villain driven by `useBob`. Replace them with measured v0.0.2 behavior.

- [ ] **Step 3: Update testing protocol**

Add the profiler-based baseline/relative gate, phase-4 worst case, `double-fire-single-charge`, `bubble-at-full-charges`, win/over race, multitouch and dev-only QA shortcut.

- [ ] **Step 4: Update changelog/index**

Add the user-visible combat feature under `[Unreleased]` and link the plan in `docs/README.md`.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md docs/testing.md docs/results.md CHANGELOG.md docs/README.md
git commit -m "docs: document v0.0.2 combat implementation"
```

## Task 8: Full verification and performance gate

**Files:**

- Modify only the result record: `docs/results.md` or a new dated QA record under `docs/` if required by the existing protocol.

- [ ] **Step 1: Run the complete local suite**

```bash
npm run typecheck
npm run lint
npm test
```

Expected: all pass with no skipped combat scenarios.

- [ ] **Step 2: Build the release target**

```bash
npx expo run:android --variant release
```

Expected: release build installs without runtime errors.

- [ ] **Step 3: Run manual combat QA**

Verify hero selection, lane movement, five attack phases, zombie centering/hitbox, bubble thresholds, charge cap, double-fire, power rotation, five-hit victory, three-hit defeat, replay/reset, background/resume, 120Hz and multitouch.

- [ ] **Step 4: Run the profiler gate**

Compare v0.0.2 with v0.0.1 on the same device/build. Use `adb shell dumpsys gfxinfo <package>` on Android or Metal System Trace on iOS. Do not use the `LOOP` readout as presented FPS.

- [ ] **Step 5: Apply the fallback if required**

If the fixed four-variant tree exceeds the p95 +10% gate, replace it with typed sub-pools, rerun local checks and the profiler, and document the reason in `docs/results.md`.

- [ ] **Step 6: Final review**

Run `git diff HEAD~1`, check that no per-frame value entered Zustand, confirm `.superpowers/` is ignored, and verify the design source and implementation agree on colors/geometry.

- [ ] **Step 7: Commit final verification**

```bash
git add docs/results.md
git commit -m "test: verify v0.0.2 combat on device"
```

