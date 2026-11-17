# Food Fight v0.0.5 — Stability, Persistence, and Production Validation Specification

- **Date:** 2026-11-16
- **Status:** Approved
- **Target release:** `0.0.5`
- **Base branch:** `master` (PR #4 merged, commit `87bb8f0`)
- **Working branch:** `feature/v005`
- **Design source of truth:** `docs/design/project/FoodFight v0.0.5.dc.html`, `Foodie.dc.html`, `FoodFight v0.0.4.dc.html`

---

## 1. Context and Goals

Food Fight v0.0.4 established complete core gameplay: Alface, Feijão, and Arroz hero selection; four static difficulty presets; three-lane endless runner with fixed pools; Barão Brigadeiro with 5 HP; candy and zombie attacks; food bubbles charging special powers; screen-clearing power shots; typewriter villain dialogue with animated mouth; laughing zombies; and staged villain defeat with confetti before victory.

v0.0.5 is a dedicated **stabilization, persistence, and production validation** release. No new villains, maps, audio, inventories, multiplayer, or hero-specific power branches are added.

### Primary Objectives

1. **State & Replay Reliability:** Full match reset across restarts, hero swaps, and difficulty replays, preventing delayed callbacks from prior match generations.
2. **Villain Dialogue State Robustness:** Preserve unique request identity (`dialogueRequestId`), ensure repeated identical lines restart typing cleanly from letter 1, restrict animated mouth strictly to character revelation, and keep defeat dialogue visible through staged defeat.
3. **App Pause, Background & Resume:** Freeze combat simulation when app is `inactive` or `background`; prevent time accumulation / teleporting deltas on resume; provide discrete pause indicator without per-frame React state or re-renders.
4. **Transition-Accurate Collision:** Use the hero's actual visual vertical position during the 130 ms lane transition rather than instant destination-lane membership, eliminating false-positive and false-negative collisions while maintaining zero-allocation UI-thread invariants and harness parity.
5. **Persistent Best Score:** Encapsulate local persistence via `@react-native-async-storage/async-storage` in `src/store/bestScoreStorage.ts` with asynchronous non-blocking hydration, strict validation (integers $\ge 0$), safe fallback on I/O error, and survival across app restarts.
6. **Visual Fidelity & Verified Bob Offsets:** Confirm and apply exact hero walk-cycle bob offsets directly verified in `docs/design/project/Foodie.dc.html` (Alface `0s`, Feijão `-0.15s`, Arroz `-0.3s`); keep `assets/android-icon-monochrome.png` documented as pending visual decision.
7. **Performance & Profiling Protocol:** Complete device profiling guide for physical hardware release builds.

---

## 2. Invariants (Mandatory Architectural Rules)

1. **Per-frame values never enter React state or Zustand:** Positions, counters, and animation values live in Reanimated shared values on the UI thread or local worklet state.
2. **`useFrameCallback` allocates zero objects per frame:** No new arrays, objects, closures, or allocations inside the worklet frame loop.
3. **Fixed pools only:** Obstacles (12), shots (3), bubbles (1), and confetti bursts (8) remain fixed and statically allocated.
4. **Skia reads shared values directly:** Visual transforms read from shared values without bridge roundtrips.
5. **Zustand receives only discrete events:** Hit, score increment, food collection, power accepted, staged defeat trigger, defeat complete, and screen transitions.
6. **Production and deterministic harness maintain strict parity:** Same rules, hitbox insets, clamp limits, formulas, and timings in both `src/hooks/useRunnerEngine.ts` and `src/engine/combatSimulation.ts`.
7. **Design handoff is the single source of truth for shapes and colours:** Visual details originate in `docs/design/` and are ported to code.
8. **No `systems/` layer:** Gameplay code lives in `useRunnerEngine.ts` and pure engine math in `src/engine/`.
9. **Never touch or commit `docs/design/project/support.js`:** Local unrelated workspace file.
10. **Storage operations never throw or block gameplay:** Persistence is non-blocking and resilient to corruption or storage unavailability.

---

## 3. Detailed Scope

### 3.1 Match State and Replay Reset

When starting a new match (first start, replay after Game Over, replay after Victory, or switching heroes), the following state elements must reset cleanly:

- Lives (reset to `START_LIVES` = 3)
- Score (reset to 0)
- Charges (reset to 0)
- Power rotation index (reset to 0)
- Barão HP (reset to `VILLAIN_HP` = 5)
- Staged defeat state (`defeatActive` = 0, `villainDying` = false)
- Current dialogue & typed dialogue text (cleared to empty)
- Dialogue typing/hold timers (cancelled)
- Pending burst zombie attacks (`burstPending` = 0)
- Active bubble (`bubbleActive` = 0)
- Active shots (`shotActive[i]` = 0)
- Active confetti effects (`burstFxActive[i]` = 0)
- Active enemies (`obstacleActive[i]` = 0, `obstacleScored[i]` = 0)
- Match generation counter (incremented; callbacks from previous generations discarded)
- Invulnerability state (`invulnUntil` = 0, `heroOpacity` = 1)
- Scroll position (`scrollX` = 0)
- Spawn and milestone accumulators (`spawnAccum` = `INITIAL_SPAWN_ACCUMULATOR_MS`, `nextMilestone` = 100)
- Pause state (`appPaused` = 0, `frozen` = 0)

**Guards:**
- `isGameOverModalVisible` ensures no terminal modal renders while `screen === 'game'`.
- All bridge callbacks from UI thread to JS verify `generation === activeMatchGeneration.current`.

### 3.2 Barão Dialogue

- **Unique Request Identity:** Every dialogue event (`triggerVillainBurst`, `showVillainTaunt`, `showVillainOuch`, `applyVillainHit`, `beginVillainDefeat`) increments `dialogueRequestId`.
- **Repeated Lines:** If the newly chosen taunt/ouch matches the preceding string, the incremented `dialogueRequestId` ensures `bindVillainDialogue` cancels existing typewriter and hold timers and restarts character reveal from character 1.
- **Mouth Animation:** `villainTalking` is set to `true` on line emission and set to `false` via `setVillainTalking(false, requestId)` immediately when the full line length has been typed. The Barão mouth animates (`ff-mouth` / `talking` prop) **only** during character reveal, remaining closed/static during post-reveal hold.
- **Defeat Dialogue Duration:** Defeat dialogue (`"NÃÃÃO! Meus doces! Isso não fica assim!!"`) uses `resolveDialogueTiming` to finish typing with at least 700 ms dwell before the 2,500 ms staged defeat triggers victory.
- **Replay / Screen Change:** Navigating away from `screen === 'game'` immediately cancels the dialogue controller and clears displayed text.

### 3.3 Pause, Background, and Resume

- **Background Freeze:** An `AppState` listener toggles `appPaused.value = 1` when state is `inactive` or `background`.
- **Simulation Invariants During Pause:**
  - Frame loop early-returns without advancing `elapsedTime`.
  - Inactive delta does not accumulate into `rawDtMs` or `dtMs`; `lastUpdateTime.value` is reset on foreground resume.
  - No enemies or shots move, no score is awarded, no hits register, no defeat timers advance.
- **Resume:** Upon returning to `active`:
  - `lastUpdateTime.value = 0` triggers bootstrap on first frame.
  - Simulation resumes smoothly from exact frozen positions without jumping or candy teleportation.
- **Visual Indication:** A lightweight discrete overlay (`isPaused`) is reflected in React when `appPaused` is active, rendered above HUD and below terminal modals, without per-frame state updates.

### 3.4 Collision During Lane Transition (130 ms)

**Current Problem:**
In v0.0.4, `moveLane(direction)` assigns `heroLane.value = next` instantly, while `heroY` animates over 130 ms via `withTiming`. In the frame loop, collision checked `obstacleLane[index].value === heroLane.value`. If a hero in lane 1 initiates a move to lane 0, an enemy in lane 0 colliding at $t=10\text{ ms}$ registers a hit even though the hero is visually still almost entirely in lane 1.

**Solution:**
1. Compute the hero's actual vertical bounding box from `heroY.value` (continuous UI-thread shared value):
   - $\text{heroTop} = \text{heroY.value}$
   - $\text{heroBottom} = \text{heroTop} + \text{HERO\_HEIGHT}$
2. For each obstacle:
   - Obstacle vertical bounds: $\text{obsTop} = \text{obstacleY}[i].\text{value}$, $\text{obsBottom} = \text{obsTop} + \text{size}$.
3. Vertical overlap condition:
   $$\text{heroTop} < \text{obsBottom} \quad \text{and} \quad \text{heroBottom} > \text{obsTop}$$
   With standard vertical margin/tolerance: vertical overlap requires intersection exceeding vertical padding ($10\text{ px}$ tolerance), ensuring clean lane-traversal semantics.
4. If vertically overlapping AND horizontally overlapping (`rectsOverlapX`), register hit.
5. In the deterministic harness (`combatSimulation.ts`):
   - Support frame-based vertical transition interpolation or continuous lane coordinate to match production logic without allocations.

### 3.5 Best Score Persistence

- **Dependency:** `@react-native-async-storage/async-storage` (approved for Expo SDK 56).
- **Module:** `src/store/bestScoreStorage.ts`.
- **Storage Key:** `@foodfight/best_score`.
- **Validation:**
  - Parse as base-10 integer.
  - Require $\text{score} \ge 0$ and $\text{score} < 10{,}000{,}000$ (safe integer boundary).
  - Return in-memory fallback on NaN, negative, string, or storage corruption.
- **Non-blocking Hydration:**
  - Game boots with initial `best: 0` (or current session best).
  - Background task reads storage and updates store `best` if persisted value is greater than session best.
  - Match start or gameplay is never blocked by pending I/O.
- **Persistence Write:**
  - When `best` increases upon match completion (`over` or `win`), asynchronously write new best score.
  - Silently catch errors; game never crashes on storage failure.
- **Replay & Switch Hero:** Replay preserves best score in store; switching heroes preserves best score in store.

### 3.6 Animations and Visual Fidelity

- **Bob Offsets:** Verified in `docs/design/project/Foodie.dc.html`:
  - `Alface`: line 31, `animation: ff-bob 0.64s ease-in-out infinite` $\rightarrow$ delay `0s`.
  - `Feijão`: line 67, `animation: ff-bob 0.64s ease-in-out -0.15s infinite` $\rightarrow$ delay `-0.15s`.
  - `Arroz`: line 100, `animation: ff-bob 0.64s ease-in-out -0.3s infinite` $\rightarrow$ delay `-0.3s`.
  - Ported into `src/render/foodie/characters/` or `useWalkCycle.ts` with named constants.
- **Pending Asset:** `assets/android-icon-monochrome.png` has no source in design handoff; remains unchanged and documented as a pending design asset.

---

## 4. Verification and Acceptance Criteria

- [ ] All automated tests pass (`npm test`).
- [ ] TypeScript compiles cleanly with zero errors (`npm run typecheck`).
- [ ] ESLint passes with zero warnings (`npm run lint`).
- [ ] Application version displayed as `v0.0.5` on select screen and in `appVersion`.
- [ ] Deterministic harness maintains exact parity with production engine.
- [ ] No git modifications to `support.js`.
- [ ] No merge to `master` without explicit user instruction.
