# Food Fight v0.0.5 Implementation Plan — Stability, Persistence, and Validation

> For agentic workers: use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

Goal: Implement Food Fight v0.0.5 stabilization, persistent best score via AsyncStorage, robust replay resets, accurate lane transition collisions on UI thread, pause/resume background safety, dialogue identity preservation, verified hero bob offsets, and complete test/doc coverage.

Architecture: Fixed-pool UI-thread game loop remains the authority for per-frame positions, obstacle recycling, power firing, and collision checks. Zustand receives only discrete events; AsyncStorage persists best score asynchronously without blocking gameplay.

Tech Stack: Expo SDK 56, React Native 0.85, React Native Skia 2.6, Reanimated 4, React Native Worklets 0.8.3, Zustand 5, @react-native-async-storage/async-storage 2.2.0, TypeScript 6, Vitest 5.

## Global Constraints

- Preserve gameplay invariants: no per-frame values in React or Zustand; no allocation in UI-thread worklet.
- Use `docs/design/project/FoodFight v0.0.5.dc.html` and `Foodie.dc.html` as the visual source of truth.
- Keep production (`useRunnerEngine.ts`) and harness (`combatSimulation.ts`) in strict parity.
- Never touch or stage `docs/design/project/support.js`.
- Update `CHANGELOG.md` under `[Unreleased]`.

---

### Task 1: Version bump and persistent best score

Files:
- Modify `package.json`, `app.json`.
- Create `src/store/bestScoreStorage.ts`.
- Create `src/store/bestScoreStorage.test.ts`.
- Modify `src/config/appVersion.ts`, `src/config/appVersion.test.ts`.
- Modify `src/store/gameStore.ts`, `src/store/gameStore.test.ts`.

- [ ] Step 1: Bump version to `0.0.5` in `package.json` and `app.json`.
- [ ] Step 2: Implement `src/store/bestScoreStorage.ts` with load/save/normalize/validate/fallback logic.
- [ ] Step 3: Write tests for `bestScoreStorage` (first run, load valid, corrupted storage, I/O failure, negative/invalid scores).
- [ ] Step 4: Wire `bestScoreStorage` into `gameStore.ts` non-blockingly (hydrate on start, save when best score updates).
- [ ] Step 5: Verify with `npm test`.

---

### Task 2: Match state & replay reset strengthening

Files:
- Modify `src/hooks/useRunnerEngine.ts`.
- Modify `src/store/gameStore.ts`.
- Modify `src/store/gameStore.test.ts`.
- Modify `src/features/game-over/gameOverVisibility.ts`.
- Modify `src/features/game-over/gameOverModal.test.ts`.

- [ ] Step 1: Audit all 18 reset items in `engine.reset()` and store `actions.start()`/`reset()`.
- [ ] Step 2: Guard callbacks with `matchGeneration` and ensure delayed callbacks from old replays are discarded.
- [ ] Step 3: Ensure `GameOverModal` cannot render while `screen === 'game'`.
- [ ] Step 4: Write regression tests for replay after Game Over, replay after Win, switching heroes, and preserving difficulty and best score.

---

### Task 3: Villain dialogue identity, typewriter repeat, and mouth animation synchronization

Files:
- Modify `src/features/game/villainDialogue.ts`.
- Modify `src/features/game/villainDialogue.test.ts`.
- Modify `src/store/gameStore.ts`.

- [ ] Step 1: Verify `dialogueRequestId` increment on every dialogue request, even with identical text.
- [ ] Step 2: Ensure identical lines cancel existing timers and restart typewriter effect from letter 1.
- [ ] Step 3: Ensure `setVillainTalking(false, requestId)` triggers immediately when text typing finishes so mouth stops animating during hold.
- [ ] Step 4: Add tests for repeated identical lines during typing, during hold, and during defeat sequence.

---

### Task 4: Pause, background, and resume safety

Files:
- Modify `src/hooks/useRunnerEngine.ts`.
- Modify `src/features/game/GameScreen.tsx`.
- Modify `src/features/game/GameScreen.styles.ts`.
- Create/modify pause tests in `src/engine/combatSimulation.test.ts` or game engine tests.

- [ ] Step 1: Ensure `appPaused.value = 1` freezes frame time, delta accumulation, and simulation progression when backgrounded.
- [ ] Step 2: Reset `lastUpdateTime.value = 0` on foreground resume to prevent teleporting delta.
- [ ] Step 3: Render discrete visual pause indicator without per-frame React state or re-render overhead.
- [ ] Step 4: Write tests for background $\rightarrow$ foreground transitions.

---

### Task 5: Collision during lane transition (130 ms)

Files:
- Modify `src/hooks/useRunnerEngine.ts`.
- Modify `src/engine/combatMath.ts`.
- Modify `src/engine/combatMath.test.ts`.
- Modify `src/engine/combatSimulation.ts`.
- Modify `src/engine/combatSimulation.test.ts`.

- [ ] Step 1: Define continuous vertical bounding box collision function in `combatMath.ts`.
- [ ] Step 2: Integrate continuous vertical collision into `useRunnerEngine.ts` hot loop with zero per-frame allocation.
- [ ] Step 3: Integrate continuous vertical collision into `combatSimulation.ts` to preserve harness parity.
- [ ] Step 4: Write unit tests verifying initial, midpoint, and final transition positions avoid false positives and false negatives.

---

### Task 6: Visual fidelity & verified hero bob offsets

Files:
- Modify `src/render/foodie/useWalkCycle.ts`.
- Modify `src/render/foodie/Foodie.tsx`.
- Update hero character components if needed.

- [ ] Step 1: Add named constants for verified bob offsets from `Foodie.dc.html`: Alface `0s`, Feijão `-0.15s`, Arroz `-0.3s`.
- [ ] Step 2: Pass hero-specific phase offset into `useWalkCycle` or `useBob`.
- [ ] Step 3: Verify character rendering and test suite.

---

### Task 7: Full suite verification and documentation update

Files:
- Update `docs/architecture.md`.
- Update `docs/testing.md`.
- Update `docs/troubleshooting.md`.
- Update `README.md`.
- Update `CHANGELOG.md` under `[Unreleased]`.
- Update `docs/README.md`.

- [ ] Step 1: Run `npm test`.
- [ ] Step 2: Run `npm run typecheck`.
- [ ] Step 3: Run `npm run lint`.
- [ ] Step 4: Ensure `support.js` is not modified or staged.
- [ ] Step 5: Final review and report to user.
