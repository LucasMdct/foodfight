# Food Fight v0.0.3 Gameplay Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with a test-first cycle. Do not run an Android/native build or generate an APK until the user has reviewed the implementation.

**Goal:** Add the v0.0.3 difficulty flow and Barão 2.0 gameplay to the existing v0.0.2 engine without moving per-frame state out of the UI-thread fixed-pool architecture.

**Architecture:** Extend `GameState` with a `difficulty` selection and add a native `DifficultyScreen` between hero selection and gameplay. Keep difficulty configuration, milestone counters, projectile movement, Barão movement, and power-mode state in worklet-safe formulas/shared values; only discrete events cross back to Zustand. Extend the existing deterministic combat harness instead of creating a second engine.

**Tech Stack:** Expo SDK 56, React Native 0.85, React Native Skia 2.6.2, Reanimated 4.3.1, Worklets 0.8.3, Zustand 5, TypeScript 6, Vitest 5.

## Global Constraints

- Read `docs/architecture.md` before changing `src/hooks/useRunnerEngine.ts`.
- Per-frame values stay in Reanimated shared values and are read directly by Skia.
- The frame callback allocates no arrays, objects, or closures per frame.
- Keep the fixed enemy pool at `GAME_CONSTANTS.ENEMY_POOL_SIZE` and the shot pool at `GAME_CONSTANTS.POWER_SHOT_POOL_SIZE`.
- Difficulty is selected once before a match and is not changed inside the match.
- Use the v0.0.3 design bundle as the source of truth for visual sizes, colours, copy, and layout.
- Do not add audio, story mode, map navigation, new villains, skins, inventory, persistence, or new dependencies.
- Every production behavior is introduced by a failing Vitest test first.
- Do not run `eas build`, `expo run:android`, or another native/APK build before manual review.

---

### Task 1: Add v0.0.3 domain state and difficulty formulas

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/types/constants.ts`
- Modify: `src/engine/combatMath.ts`
- Test: `src/engine/combatMath.test.ts`

**Interfaces:**
- Produce `Difficulty = 'mfacil' | 'facil' | 'dificil' | 'impossivel'`.
- Produce `DIFFICULTY_CONFIG` with the four handoff presets.
- Produce `difficultyConfigAt(difficulty)` and `milestoneCountAt(score)` as worklet-safe pure functions.
- Add `difficulty: Difficulty` to `GameState` and `start: (difficulty: Difficulty) => void` to `GameActions`.

- [ ] **Step 1: Write failing formula tests**

Add tests for the four exact labels and values, unknown-key fallback to `facil`, milestone counts at 0/99/100/199/200, and the 40-point power-mode boundary helper if the helper is extracted.

```ts
it('exposes the four v0.0.3 difficulty presets', () => {
  expect(difficultyConfigAt('impossivel')).toMatchObject({
    label: 'Impossível',
    speed: 560,
    interval: 540,
    doubleSpawnChance: 0.55,
    acceleration: 0.009,
  });
});

it('counts one milestone at score 100 and two at score 200', () => {
  expect(milestoneCountAt(99)).toBe(0);
  expect(milestoneCountAt(100)).toBe(1);
  expect(milestoneCountAt(200)).toBe(2);
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm test -- src/engine/combatMath.test.ts`

Expected: FAIL because `Difficulty`, `difficultyConfigAt`, and `milestoneCountAt` do not exist yet.

- [ ] **Step 3: Implement the minimal constants and formulas**

Add named constants to `GAME_CONSTANTS` for `MILESTONE_SCORE_STEP`, `POWER_MODE_SCORE_DURATION`, `VILLAIN_RENDER_WIDTH`, `VILLAIN_RENDER_HEIGHT`, `ZOMBIE_RENDER_SIZE`, `PROJECTILE_SIZE_MULTIPLIER`, and `VILLAIN_BURST_COUNT`. Add the typed difficulty table and these pure functions:

```ts
export type Difficulty = 'mfacil' | 'facil' | 'dificil' | 'impossivel';

export const difficultyConfigAt = (difficulty: Difficulty): DifficultyConfig => {
  'worklet';
  return DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.facil;
};

export const milestoneCountAt = (score: number): number => {
  'worklet';
  return Math.floor(score / GAME_CONSTANTS.MILESTONE_SCORE_STEP);
};
```

Set `INITIAL_GAME_STATE.difficulty` to `'facil'` and update the action signature without changing the existing initial screen.

- [ ] **Step 4: Run the focused suite**

Run: `npm test -- src/engine/combatMath.test.ts src/store/gameStore.test.ts`

Expected: PASS for all existing tests plus the new formula tests.

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/types/constants.ts src/engine/combatMath.ts src/engine/combatMath.test.ts
git commit -m "feat: add v0.0.3 difficulty domain" -m "- Add typed difficulty presets and score milestone formulas" -m "- Extend game state with the selected difficulty"
```

### Task 2: Add the difficulty selection screen and flow

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/features/select/SelectScreen.tsx`
- Modify: `src/features/index.ts`
- Modify: `App.tsx`
- Create: `src/features/difficulty/DifficultyScreen.tsx`
- Create: `src/features/difficulty/DifficultyScreen.styles.ts`
- Create: `src/features/difficulty/index.ts`
- Test: `src/store/gameStore.test.ts`

**Interfaces:**
- `actions.toDifficulty()` changes only `screen` to `'difficulty'`.
- `actions.start(difficulty)` resets match state and stores that difficulty.
- `DifficultyScreen` renders the selected hero, four cards, and `← Trocar herói`.
- `Flow` renders `DifficultyScreen` for `screen === 'difficulty'`.

- [ ] **Step 1: Write failing store/flow tests**

Add tests proving that `toDifficulty()` preserves the selected hero, `start('dificil')` enters gameplay with `difficulty: 'dificil'`, replay keeps the difficulty, and `toSelect()` returns to hero selection.

- [ ] **Step 2: Run the focused store suite**

Run: `npm test -- src/store/gameStore.test.ts`

Expected: FAIL because the new screen and action contracts are absent.

- [ ] **Step 3: Implement state transitions and screen**

Use theme tokens and `useUiScale()` for the four cards. Match the handoff copy and visual hierarchy: green one-star Muito Fácil, amber two-star Fácil, coral three-star Difícil, and dark purple four-star Impossível. The button actions must call `actions.start(key)` directly; no local gameplay state is allowed.

- [ ] **Step 4: Run store and type checks**

Run: `npm test -- src/store/gameStore.test.ts` and `npm run typecheck`

Expected: PASS with `screen` narrowed to include `'difficulty'` everywhere it is consumed.

- [ ] **Step 5: Commit**

```bash
git add App.tsx src/features src/store/gameStore.ts src/store/gameStore.test.ts src/types/game.ts
git commit -m "feat: add v0.0.3 difficulty selection" -m "- Insert the difficulty screen between hero selection and gameplay" -m "- Preserve difficulty on replay and preserve hero selection when going back"
```

### Task 3: Extend the deterministic combat harness

**Files:**
- Modify: `src/engine/combatSimulation.ts`
- Modify: `src/engine/combatSimulation.test.ts`

**Interfaces:**
- Extend the scenario input with `difficulty?: Difficulty`, `milestoneScore?: number`, and `powerMode?: boolean` only when needed by an explicit test.
- Keep event names typed and deterministic: `villainBurst`, `powerChargeGranted`, `powerCleared`, `projectileSpawned`.
- Use the same difficulty formulas, milestone logic, seeded RNG, resistant flag, and fixed-pool limits as production.

- [ ] **Step 1: Add failing scenarios**

Add tests for:

```ts
it('uses the selected difficulty for speed and spawn cadence', () => { /* mfacil is slower than impossivel */ });
it('spawns a three-zombie burst and grants one charge at 100 points', () => { /* one milestone */ });
it('does not clear resistant burst projectiles during power mode', () => { /* vip survives */ });
it('uses the villain lane for normal and burst projectile spawns', () => { /* lane event matches villain lane */ });
```

Also retain the existing double-fire, bubble, freeze, hitbox, pool saturation, and result-race scenarios unchanged.

- [ ] **Step 2: Run the harness suite and verify red**

Run: `npm test -- src/engine/combatSimulation.test.ts`

Expected: FAIL only for the new v0.0.3 scenarios.

- [ ] **Step 3: Implement the minimal harness behavior**

Derive speed and interval from `difficultyConfigAt`, emit one milestone event per crossed threshold, emit exactly `VILLAIN_BURST_COUNT` resistant zombies from the current villain lane, increment charges through the capped helper, and clear only non-resistant active enemies while power mode is active.

- [ ] **Step 4: Run all engine tests**

Run: `npm test -- src/engine`

Expected: PASS with deterministic output under the fixed seed.

- [ ] **Step 5: Commit**

```bash
git add src/engine/combatSimulation.ts src/engine/combatSimulation.test.ts
git commit -m "feat: model v0.0.3 combat milestones" -m "- Add difficulty-aware harness scenarios" -m "- Cover Barão bursts, power mode resistance, and lane-origin spawns"
```

### Task 4: Apply difficulty and Barão 2.0 to the UI-thread engine

**Files:**
- Modify: `src/hooks/useRunnerEngine.ts`
- Modify: `src/engine/combatMath.ts`
- Modify: `src/features/game/GameScreen.tsx`
- Modify: `src/store/gameStore.ts`
- Test: `src/engine/combatSimulation.test.ts`

**Interfaces:**
- Change `useRunnerEngine(screenWidth, screenHeight)` to `useRunnerEngine(screenWidth, screenHeight, difficulty)`.
- Add a memoized `difficultyMirror` shared value reset at match start.
- Keep `firePower()` UI-thread authorization and charge mirror unchanged except for the v0.0.3 power-mode activation.

- [ ] **Step 1: Add a failing integration assertion**

Add a harness assertion that two otherwise identical matches with `mfacil` and `impossivel` produce different first-spawn timing and speed, and that one 100-point crossing emits one burst and one charge grant.

- [ ] **Step 2: Run the focused test and verify red**

Run: `npm test -- src/engine/combatSimulation.test.ts`

Expected: FAIL because the production-aligned simulation does not yet consume the selected difficulty and milestone burst rules.

- [ ] **Step 3: Implement the worklet changes**

In `useRunnerEngine`:

1. Mirror the selected difficulty on reset; never call Zustand from the frame callback.
2. Derive `speed` and `interval` from the selected preset and elapsed time.
3. Derive each normal spawn lane from `villainY.value` using the same lane helper used by the harness.
4. On each newly crossed 100-point threshold, increment a UI-thread milestone counter, grant one capped charge, and activate three resistant zombie slots with staggered spawn timestamps/offsets. Use the fixed pool; do not create a temporary array.
5. Set `villainAttacking`/taunt through a discrete bridge at milestone start and clear it through the existing React timeout path.
6. When a power shot is accepted, set `powerUntilScore = scoreMirror + POWER_MODE_SCORE_DURATION`; while active, clear only `vip === 0` enemies ahead of the hero and emit score events.
7. Use the v0.0.3 projectile visual size constants for collision and lane-centering. Keep terminal freeze armed before `scheduleOnRN` for both win and over.

The burst timer must be represented by shared counters or preallocated slot metadata; do not use `setTimeout`, `Array.from`, `find`, `filter`, or object creation in `useFrameCallback`.

- [ ] **Step 4: Run static checks and tests**

Run: `npm test -- src/engine src/store`, `npm run typecheck`, and `npm run lint`

Expected: PASS with no new lint or TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRunnerEngine.ts src/engine/combatMath.ts src/features/game/GameScreen.tsx src/store/gameStore.ts src/engine/combatSimulation.test.ts
git commit -m "feat: add Barão 2.0 UI-thread combat" -m "- Drive attacks from the moving villain lane" -m "- Add milestone zombie bursts, capped charges, and resistant power clearing"
```

### Task 5: Update rendering and HUD for v0.0.3

**Files:**
- Modify: `src/features/game/GameScreen.tsx`
- Modify: `src/hud/Hud.tsx`
- Modify: `src/features/game-over/GameOverModal.tsx`
- Modify: `src/render/foodie/characters/Vilao.tsx` only if the existing geometry needs a handoff-backed size/mood adjustment
- Test: existing store and harness suites

**Interfaces:**
- `GameCanvas` receives `difficulty` and renders the Barão at the v0.0.3 target size with the existing `feliz`/`bravo` prop.
- `Hud` reads the difficulty label from the store and shows it without subscribing to per-frame positions.
- Result modal continues to render over the frozen scene.

- [ ] **Step 1: Add a failing UI contract test where practical**

Extend store tests to verify the selected difficulty label source is stable through replay and result transitions. Keep geometry verification manual against the supplied HTML handoff because Skia rendering is not RN-free.

- [ ] **Step 2: Run the focused suite and verify red**

Run: `npm test -- src/store/gameStore.test.ts`

Expected: FAIL until the HUD and replay state expose the selected difficulty consistently.

- [ ] **Step 3: Implement the visual changes**

Use existing theme tokens. Render the Barão at 184px-wide handoff scale with the purple aura on the game canvas, render zombie slots at 96px, enlarge normal projectile visuals by the approved multiplier, and show the difficulty label beneath the villain HP in the HUD. Keep the power button large and centered at the bottom; keep `onPressIn` as the native attack event.

- [ ] **Step 4: Run typecheck, lint, and tests**

Run: `npm run typecheck`, `npm run lint`, and `npm test`

Expected: PASS; no native build is run.

- [ ] **Step 5: Commit**

```bash
git add src/features/game/GameScreen.tsx src/hud/Hud.tsx src/features/game-over/GameOverModal.tsx src/render/foodie/characters/Vilao.tsx src/store/gameStore.test.ts
git commit -m "feat: polish v0.0.3 Barão presentation" -m "- Add the difficulty label and larger handoff-backed combat visuals" -m "- Preserve frozen result overlays and mobile power input"
```

### Task 6: Update canonical documentation and release metadata

**Files:**
- Create: `docs/specs/2026-11-02-foodfight-v003-gameplay.md`
- Modify: `docs/README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/testing.md`
- Modify: `CHANGELOG.md`
- Modify: `README.md` only if the current version or flow is shown there
- Modify: `app.json` and `package.json` only if the app version is intentionally advanced after review; do not create a release tag in this task

- [ ] **Step 1: Write the canonical v0.0.3 spec**

Copy the approved design decisions into `docs/specs/2026-11-02-foodfight-v003-gameplay.md`, including the four presets, screen flow, milestone contract, fixed-pool constraints, and explicit out-of-scope list. Link the imported design sources from `docs/design/project/`.

- [ ] **Step 2: Update implementation-facing docs**

Update `docs/architecture.md` to describe `screen: 'difficulty'`, the selected difficulty mirror, milestone/burst state, power-mode boundary, and current Barão dimensions. Update `docs/testing.md` with deterministic v0.0.3 scenarios and a manual checklist for all four difficulty cards, Barão attack position, milestone burst, power clearing, and result freeze. Add both spec and plan to `docs/README.md`.

- [ ] **Step 3: Add the Unreleased changelog entry**

Under `[Unreleased]`, document the user-visible v0.0.3 feature in English using Keep a Changelog sections. Do not remove or rewrite the historical v0.0.1, v0.0.2, or POC entries.

- [ ] **Step 4: Run documentation and static checks**

Run: `git diff --check`, `npm run typecheck`, `npm run lint`, and `npm test`

Expected: PASS. Confirm the unrelated `docs/design/project/support.js` modification remains unstaged.

- [ ] **Step 5: Commit**

```bash
git add docs/specs/2026-11-02-foodfight-v003-gameplay.md docs/README.md docs/architecture.md docs/testing.md CHANGELOG.md README.md
git commit -m "docs: document v0.0.3 gameplay feature" -m "- Add the canonical v0.0.3 spec and validation protocol" -m "- Update architecture, index, and Unreleased changelog without rewriting history"
```

### Task 7: Final verification before review handoff

**Files:**
- No production changes expected.

- [ ] **Step 1: Run the complete verification set**

Run:

```bash
npm run typecheck
npm run lint
npm test
git diff --check
git status --short
git log --oneline --decorate -8
```

Expected: typecheck, lint, and tests exit 0; `git diff --check` reports no whitespace errors; the only unrelated working-tree modification is `docs/design/project/support.js`; no APK/native build command has been run.

- [ ] **Step 2: Review the diff against the design handoff**

Manually inspect the four difficulty cards, game HUD, Barão scale/aura, lane-origin attacks, milestone burst, power-mode resistance, result freeze, and the loading/select flow. Compare screenshots or the running preview after the user reviews the code; do not generate an APK in this phase.

- [ ] **Step 3: Prepare the review handoff**

Report the branch name, commit list, verification output, known manual-review items, and explicitly state that APK generation is waiting for user approval.
