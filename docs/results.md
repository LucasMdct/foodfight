# POC Results

**Concluded:** 2026-07-04 (documented 2026-08-11)
**Version:** 1.0.0
**Verdict:** ⏳ **Unresolved** — the last recorded run failed the frame-rate target and has not been re-measured.

> **Open item:** `master` records **30–50 fps** on the 2026-07-04 run (release APK, physical ARM). Commit `2c21cd2` removed that figure, claiming it came from an old README, but no replacement measurement was recorded. This document keeps the figure as the **last recorded result** and marks the criterion **unverified**. Do not treat the POC as approved until a new run exists.

---

## Executive summary

The POC set out to answer one question before committing to a full game build: *can React Native Skia hold the gameplay loop at an acceptable frame rate on a mid-range device?*

**Not settled.** The last recorded run measured 30–50 fps against a ≥55 fps bar. Collisions, memory, input latency and stability passed under manual observation. The frame-rate criterion is unresolved: the only recorded figure is 30–50 fps, and it has not been re-measured.

The POC validated the mechanics and the engine invariants. It did **not** clear the frame-rate question on the current evidence. The engine carries forward into v0.0.1, but the performance decision is still open.

---

## Test conditions

| | |
|---|---|
| **Device** | Physical Android handset, ARM |
| **Build** | Release APK, installed directly (not a Metro dev build) |
| **Date** | 2026-07-04 |
| **Stack** | Expo SDK 56 · React Native 0.85.3 · Skia 2.6.2 · Reanimated 4.3.1 · Zustand 5 |
| **Configuration** | Stock POC constants — 15-slot pool, 300 px/s, 800 ms spawn interval |
| **Last recorded frame rate** | 30–50 fps (disputed; see open item) |

> A release build on physical hardware is the only valid configuration for these numbers. Dev builds carry Metro and debugging overhead; emulators do not reproduce ARM GPU behaviour.

---

## Results against acceptance criteria

The criteria come from [`specs/poc-runner-skia.md`](./specs/poc-runner-skia.md).

| Criterion | Target | Measured | Result |
|---|---|---|---|
| **Frame rate** | 60 fps, ≥55 acceptable | 30–50 fps (last recorded; not re-measured) | ⏳ Unverified |
| **Swipe latency** | < 100 ms perceived | No perceptible lag after the input fixes | ✅ Pass (manual) |
| **Collision accuracy** | No obvious false positives or negatives | Accurate in both orientations | ✅ Pass (manual) |
| **Memory** | No leak after 2+ min of play | Flat; no growth trend observed | ✅ Pass (manual) |
| **Stability** | No crashes | Zero, after the collision crash was fixed | ✅ Pass (manual) |

Four criteria have recorded manual passes. The frame-rate criterion is unresolved: the last recorded value fails the target, but the figure's provenance is disputed and no new run exists.

---

## Findings

### 1. The loop architecture is sound; the frame-rate verdict is not

The last recorded run measured 30–50 fps on mid-range ARM. What the evidence supports is narrower than "the stack cannot do it":

- The entire simulation runs in a UI-thread worklet — React is not in the frame path at all
- The obstacle pool allocates nothing per frame, so GC is not the likely cause
- Per-frame work is O(15) integer and float arithmetic
- Memory is flat, which rules out a leak as the cause

**Implication:** the design decisions are validated as an architecture. Whether 60 fps is reachable on this hardware is still open, because the only figure on record is the disputed 30–50 fps run and the current scene has not been measured.

### 2. Collisions are reliable

After the collision crash was fixed in 0.3.0, detection has been accurate. The lane-index check plus X-axis AABB with a 10 px hitbox inset produced no false hits and no missed hits during play. The forgiveness padding makes near-misses feel fair.

### 3. Layout adapts cleanly to both orientations

In the POC, lane geometry derived from live `useWindowDimensions()` rather than fixed constants, so portrait and landscape both worked without special-casing. Orientation locking through `expo-screen-orientation` behaved correctly, and the fallback path kept the game reachable if the lock failed. v0.0.1 keeps that approach and now resyncs `heroY` when the lane height changes, so a resize cannot leave the hero on an old lane.

*(v0.0.1 later locked landscape and dropped the selection screen — this finding is what made that safe.)*

### 4. Input latency was a fixable problem, not a stack limitation

Early builds had perceptible lane-change lag. Moving to Fling gestures with a worklet `onEnd` and a 100 ms JS-side debounce removed it. Input was never the bottleneck.

---

## What was deliberately left out

| Excluded | Reason |
|---|---|
| Real sprites and animation | Geometric placeholders answer the performance question equally well |
| Audio | No bearing on the question being tested |
| Leaderboards, persistence, backend | Not part of the MVP |
| Multi-resolution asset pipeline | Responsive layout covers the POC's needs |

---

## Recommendation

**Do not decide yet.** No engine change is justified by the current evidence, and no approval is either. The mechanics and the architecture are validated; the frame-rate criterion is unresolved. Measure v0.0.1 on hardware before choosing.

If the re-measurement confirms ≥55 fps, record the conditions and close the POC as approved. If it confirms <55 fps, apply the levers first; only then decide whether the render stack is the ceiling.

What that means in practice:

- **Keep the engine's invariants.** No per-frame React state, no allocation in the worklet. These are the reason the loop itself is not the bottleneck, and they are easy to break silently.
- **Re-measure as the scene grows.** v0.0.1 draws considerably more than the POC did — character geometry, a full-screen scrolling background, lane dividers, a floating villain. The POC's result does not transfer automatically. See [testing.md](./testing.md).
- **Know the levers.** If frame rate does dip on a richer scene, the cheapest fixes are pool size, spawn interval, and background complexity — in that order. Listed in [architecture.md](./architecture.md).
- **Record distributions, not a range.** p50/p95/p99 frame time and dropped-frame percentage are comparable; "30–50 fps" is not.

### Follow-up worth doing

- Complete the frame-rate re-measurement and record the figure, device and build conditions here
- Test on ARMv8 versus ARMv7 to see how much performance varies by device generation
- Test on Android 12+ devices with 90/120 Hz displays, where the 16 ms throttle interacts with the refresh rate
- Establish a frame budget breakdown (GPU vs CPU) as a baseline for future scenes

---

## Reproducing these results

Follow the protocol in [testing.md](./testing.md). It documents the test phases, what to record, and the profiler setup for both platforms.

---

## Related

- [architecture.md](./architecture.md) — why the implementation looks the way it does
- [specs/poc-runner-skia.md](./specs/poc-runner-skia.md) — the original specification
- [../CHANGELOG.md](../CHANGELOG.md) — how the code got here
