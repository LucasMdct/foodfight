# Troubleshooting

Symptom → cause → fix, for Food Fight v0.0.1.

---

## Setup

### App will not start / Metro errors on launch

```bash
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

If it still fails, the native side is stale:

```bash
npx expo prebuild --clean
npm run android   # or: npm run ios
```

### Skia, Reanimated or Gesture Handler module not found

All three need a native rebuild — they cannot be hot-loaded into an existing binary. After installing or upgrading any of them:

```bash
npx expo prebuild --clean && npm run android
```

Reanimated also requires `react-native-worklets` (pinned at 0.8.3) and its Babel plugin. Check `babel.config.js` if worklets throw at runtime.

### Fonts never load / app stuck on the loading screen

`LoadingScreen` holds until `useFonts` resolves the four Fredoka weights. If it never clears, `@expo-google-fonts/fredoka` failed to install or resolve — reinstall and rebuild. A dev build with a cold Metro cache can also stall here; try `npx expo start --clear`. If `useFonts` reports an error, the app now proceeds with the system font and logs `[fonts] Fredoka failed to load`; a silent hang means that fallback did not run.

### `pod install` fails on iOS

`/ios` is gitignored and regenerated. Delete it and re-run `npx expo prebuild`.

### Husky hooks not running

Hooks install via the `prepare` script. If they are silent:

```bash
npm run prepare
```

Pre-commit runs lint-staged with Prettier; pre-push runs `tsc` plus lint.

---

## Performance

### Frame rate below 55

**First, rule out the measurement.** These invalidate any reading:

- Remote JS debugging enabled → shake device → *Disable Remote JS Debugging*
- Dev build instead of release
- Emulator instead of physical device
- Device thermally throttled or below 30% battery

Note the loop-rate readout only renders under `__DEV__`. In a release build, read frame rate from the profiler.

If the reading is valid, the levers in order of effect:

1. Lower `ENEMY_POOL_SIZE` (12 → 8) — removes draw calls directly, biggest win
2. Increase the selected difficulty's fixed spawn interval — fewer simultaneous candies
3. Simplify `Tablecloth` — a full-screen layer repainted every frame, the largest single draw
4. Reduce path complexity in `src/render/foodie/characters/`

The POC's frame-rate criterion is unresolved: the last recorded run measured 30–50 fps on mid-range ARM with a much simpler scene ([results.md](./results.md)). v0.0.1 draws more, so some headroom loss is expected rather than surprising — but a large drop points at the scene, not the loop.

### Frame rate degrades over time

Different problem from a low but flat frame rate. Two candidates:

- **The visible enemy count rises.** Spawn speed and interval stay fixed for the selected difficulty, but overlapping projectiles can increase draw cost. Compare active slot counts early and late in a fresh run.
- **The pool is not recycling.** `obstacleActive[i]` must return to 0 when a candy exits left. Confirm with `adb shell dumpsys meminfo <package>` over several minutes; sawtooth or rising memory means allocation somewhere in the frame path.

### Game runs too fast or too slow

The 16.0 ms throttle in `useRunnerEngine` caps the simulation update cadence at roughly 60 per second. It does not make gameplay speed display-dependent, because movement uses the real measured delta; removing it changes update cadence, not correctness. On a 90 Hz panel the throttle yields ~45 updates/s, so the dev FPS counter is **loop-update rate**, not presented FPS. Use `dumpsys gfxinfo` for real frame timing.

If the game jumps after returning from background, check `MAX_FRAME_DELTA_MS` (50 ms) and the `AppState` listener in `useRunnerEngine`; both exist so a long pause cannot be integrated as one huge delta.

---

## Input

### Swipes not registering

- `GestureHandlerRootView` must wrap the whole tree in `App.tsx`. Without it, gestures silently never fire.
- Gesture Handler needs a native rebuild after install: `npx expo prebuild --clean`.
- Fling is a **discrete** gesture. A slow drag will not trigger it — the motion has to be a flick.
- A tap is handled separately: top half moves up, bottom half moves down. It shares the 100 ms debounce with flings.

### Only every other swipe works

Working as designed. `SwipeHandler` debounces at 100 ms so one physical flick cannot register twice. Rapid repeated flicks inside that window collapse into one. Taps share the same debounce.

### Tap does nothing

The tap gesture covers only the canvas; taps on the HUD or Game Over buttons do not move the hero by design. If a tap on the playfield does nothing, check that `SwipeHandler` wraps the canvas and that the 100 ms debounce is not swallowing a preceding fling.

### Swipes feel laggy

Almost always the remote debugger. Disable it and re-measure. If lag persists in a release build, log timestamps in `handleSwipe` and when `heroY` settles to find which side is slow. Lane transitions are 130 ms by design — that is animation duration, not latency.

### Hero does not move at game over

Intended. `moveLane` returns early when `gameOver.value === 1`.

### Control hint never disappears

It hides on the first successful lane change, via `GameScreen`'s wrapper around `engine.moveLane`. If swipes are not registering at all, fix that first — the hint is a symptom, not the fault.

---

## Gameplay

### Collisions register when they should not

Check `HERO_HITBOX_PADDING` (18). It insets the hero hitbox on the X axis — raising it makes collisions more forgiving, lowering it makes them stricter.

Only the X axis is tested; Y overlap is implied by the lane-index check. If lane geometry is ever changed so that hero and candy are no longer both centred in their lane, that assumption breaks and a Y test becomes necessary. During the 130 ms lane transition, collision already uses the destination lane, so a hit can register before the hero visually arrives; this is a known debt, not a rendering bug. See [architecture.md](./architecture.md).

### Collisions never register

- Is the hero invulnerable? A hit grants 1.4 s of immunity, visible as four blinks.
- Do lane indices agree? Both `heroLane` and `obstacleLane` are 0-based, top to bottom.

### A single hit costs more than one life

`applyHit` is guarded by the invulnerability window, so a candy cannot register twice. If lives drop by two, look for a second candy overlapping in the same lane on the same frame — the loop tests every active slot.

### Candies stop spawning

All 12 enemy slots are occupied, so the spawn tick finds nothing free and skips silently. Increase the selected difficulty's fixed interval or `ENEMY_POOL_SIZE` if this happens too often.

### All candies spin identically

Intended. One `candySpin` shared phase drives every slot — one animation instead of eight. Independent spin would need per-slot shared values.

### Candy types always appear in the same order

Intended. Type is fixed per slot index: `['lolli','candy','donut'][i % 3]`. It is not random, and it is not state.

### Candies remain on screen after "Play Again"

`GameScreen` calls `engine.reset()` in an effect keyed on `screen === 'game'`. If the field is dirty, that effect did not fire — check the screen transition actually passed through the store, since `GameScreen` stays mounted across `'game'` and `'over'` and will not remount on its own.

### Wrong difficulty after a restart

Speed and interval come from the selected fixed preset. `engine.reset()` restores the difficulty mirror; if a restart uses the wrong preset, check that reset ran and the selected difficulty was preserved.

### Score not incrementing

Score is awarded for **dodging** — 10 points when a candy exits the left edge while active. A candy that hits the hero still exits and still scores; the penalty is the lost life.

### Best score not updating

`best` updates inside the same transition that sets `screen: 'over'`. It only rises when the finished run beats it, and it survives `reset()` along with the hero choice. It is **in-memory only**: a cold start resets it.

---

## Rendering and layout

### Character shapes look wrong

Geometry is ported verbatim from `docs/design/project/Foodie.dc.html`. That file is the source of truth — fix it there first, then port. `Foodie` scales each character uniformly from its design viewBox (heroes 120×150, villain 150×160); a wrong-looking scale usually means the viewBox entry is wrong, not the path data.

### Heroes bob in unison

Known debt. The design gives each hero its own `animation-delay`; `useWalkCycle` does not replicate the offset.

### Colours look off-brand

Every colour lives in `src/theme/tokens.ts`. A colour literal in a component is the bug.

### Layout breaks on a short or unusual screen

`useUiScale` scales UI against the viewport. Lane geometry derives from `useWindowDimensions()`, and the hero's X from `HERO_X_RATIO` times width — nothing should be hardcoded to a fixed screen size. When `laneHeight` changes, the engine resyncs `heroY` and clears the pool; if the hero is drawn on the wrong lane after a resize, that effect did not run.

### Background scrolls on a screen where it should not

Scroll is driven by `scrollX`, mutated inside the frame loop below the game-over gate. Only `GameScreen` mounts the engine, so scroll outside gameplay means the engine mounted where it should not have.

---

## Still stuck

1. [architecture.md](./architecture.md) — the loop's invariants, and what breaks when they are violated
2. [testing.md](./testing.md) — how to measure properly before concluding anything
3. [results.md](./results.md) — what the POC measured, as a baseline for comparison
