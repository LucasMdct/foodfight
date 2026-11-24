# FoodFight v0.0.6 Runtime Hardening Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with verification after each task.

**Goal:** Prevent the Android Worklets closure regression from returning and ship a verifiable v0.0.6 preview build.

**Architecture:** Keep gameplay on the UI-thread worklet and fixed pools. Add a small source-level guard plus a post-export Hermes bundle verifier; neither enters the frame loop or runtime bundle.

**Tech Stack:** Expo SDK 57.0.33, React Native 0.86.3, Reanimated 4.5.1, Worklets 0.10.1, TypeScript, Vitest, Node ESM scripts.

## Global Constraints

- Do not move per-frame values into React state or Zustand.
- Do not allocate arrays or objects inside `useFrameCallback`.
- Do not add a runtime dependency.
- Do not modify `docs/design/project/support.js`.
- Keep docs in English and under `docs/`.

### Task 1: Add the worklet source regression test

**Files:**
- Create: `src/engine/workletSafety.test.ts`
- Read: `src/engine/combatMath.ts`

- [ ] Inspect every exported function in `src/engine/combatMath.ts` containing the `'worklet'` directive and assert that no signature contains `= GAME_CONSTANTS.`.
- [ ] Run `npx vitest run src/engine/workletSafety.test.ts` and confirm it passes against the fixed helpers.

### Task 2: Add the compiled-bundle verifier

**Files:**
- Create: `scripts/verify-android-bundle.mjs`
- Modify: `package.json`

- [ ] Search `dist/_expo/static/js/android` for `.hbc` files and fail with a clear message when none exist.
- [ ] Read every Hermes bundle and reject any function signature containing `= GAME_CONSTANTS.` regardless of its source-module name.
- [ ] Add `"verify:android-bundle": "node scripts/verify-android-bundle.mjs"`.
- [ ] Run `npx expo export --platform android --clear` followed by `npm run verify:android-bundle`.

### Task 3: Bump v0.0.6 metadata and docs

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/testing.md`
- Modify: `docs/troubleshooting.md`
- Create: `docs/releases/2026-11-22-foodfight-v006.md`

- [ ] Bump package and Expo versions to `0.0.6`.
- [ ] Add the v0.0.6 hardening entry under `[Unreleased]`.
- [ ] Document the bundle verifier and the Android crash-capture steps.
- [ ] Add the v0.0.6 release record with automated verification and physical-device gate.

### Task 4: Verify and publish the PR

**Files:**
- No additional source files.

- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run lint`, `npx expo-doctor`, `npx expo export --platform android --clear`, and `npm run verify:android-bundle`.
- [ ] Review the diff and ensure `docs/design/project/support.js` is not staged.
- [ ] Commit with a Conventional Commit subject and bullet-only body.
- [ ] Push `codex/v006-runtime-hardening` and open a PR against `master`.
- [ ] Confirm CI passes before generating the EAS preview build.
