# Spec: FoodFight v0.0.6 Runtime Hardening

## Objective

Make the Android release pipeline reject UI-thread worklet code that evaluates imported constants before its Reanimated closure is installed. The release must also leave a repeatable artifact-level verification command for future APKs.

## Tech Stack

- Expo SDK `57.0.33` and React Native `0.86.3`.
- React Native Reanimated `4.5.1` and Worklets `0.10.1`.
- TypeScript, Vitest, ESLint, and the existing Expo export pipeline.
- No new runtime dependency.

## Commands

```powershell
npm test -- --run
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform android --clear
npm run verify:android-bundle
```

## Project Structure

- `src/engine/combatMath.ts` — UI-thread-safe combat helpers.
- `src/engine/workletSafety.test.ts` — source-level regression guard for worklet closure hazards.
- `scripts/verify-android-bundle.mjs` — post-export Hermes bundle verifier.
- `package.json` — exposes the verifier as a repeatable command.
- `docs/testing.md` and `docs/troubleshooting.md` — release and crash-capture procedures.
- `docs/releases/` — operational release records.

## Code Style

Imported constants used by worklets must be resolved after the closure is available:

```ts
export const helper = (value?: number): number => {
  'worklet';
  const resolved = value ?? GAME_CONSTANTS.VALUE;
  return resolved;
};
```

Do not use `parameter = GAME_CONSTANTS.VALUE` in a function containing a `'worklet'` directive.

## Testing Strategy

- Keep existing deterministic combat tests unchanged and passing.
- Add a source-level test that rejects `GAME_CONSTANTS` default initializers in worklet helper signatures.
- Export the Android bundle and run `npm run verify:android-bundle` to inspect the compiled Hermes function signatures.
- Run the full automated suite, typecheck, lint, Expo Doctor, and Android export before the PR.
- Physical Android smoke testing remains a user/device gate after the PR.

## Boundaries

- Always: keep per-frame values in shared values; keep the fixed-pool/no-allocation invariant; leave `docs/design/project/support.js` untouched.
- Ask first: new runtime dependencies, native modules, or changes to the design handoff.
- Never: move frame values into Zustand, add allocations to `useFrameCallback`, or claim physical-device validation without a device result.

## Success Criteria

- `GAME_CONSTANTS` never appears in a worklet function parameter initializer.
- `npm run verify:android-bundle` passes after a clean Android export.
- All existing tests pass with no new dependency.
- The app version is `0.0.6` in package and Expo metadata.
- A PR is opened against `master` with CI passing.
- An EAS preview APK is generated from the v0.0.6 PR head.

## Open Questions

- Physical ARM profiling and end-to-end Barão smoke testing still require the user's device.
