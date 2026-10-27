# Archive — superseded documentation

> **These documents are obsolete and partly wrong. Do not use them as a guide.**
> Current documentation lives in [`docs/`](../README.md).

Kept for historical reference only: they record what was planned and believed at the time, which is occasionally useful when reading old commits.

## Why they were retired

**They describe code that was never built.** All of them reference a `src/systems/` layer (`ObstacleSystem`, `CollisionSystem`, `AnimationSystem`, `FpsCounter`), a `useGameLoop.ts` hook, a `src/utils/` directory, and separate `HeroSprite` / `ObstacleSprite` / `LaneGrid` / `FpsOverlay` components. None of it exists. The real implementation collapsed all of that into a single UI-thread worklet in `src/hooks/useRunnerEngine.ts`.

**They contradicted each other on the verdict.** `PROJECT_SUMMARY.md` declared the POC approved while `README.md` and `POC-CONCLUSION.md` described the frame rate as a failure against target. The approval was never supported by a new measurement; the current [results.md](../results.md) marks the frame-rate criterion unresolved. The documents never agreed, and a reader had no way to tell which to trust.

**They duplicated heavily.** The quick start appeared in four files, troubleshooting in three, the architecture overview in three, and the test protocol in four — each version drifting from the others.

## Contents

| File | Replaced by |
|---|---|
| `START_HERE.md` | [docs/README.md](../README.md) |
| `PROJECT_SUMMARY.md` | [root README](../../README.md) + [results.md](../results.md) |
| `ARCHITECTURE.md` | [architecture.md](../architecture.md) |
| `IMPLEMENTATION_GUIDE.md` | [architecture.md](../architecture.md) |
| `POC_GUIDE.md` | [architecture.md](../architecture.md) + [specs/poc-runner-skia.md](../specs/poc-runner-skia.md) |
| `TESTING_GUIDE.md` | [testing.md](../testing.md) |
| `PROJECT_RESULTS.md` | [results.md](../results.md) — the blank template, now filled with the real run |

Retired 2026-08-11. See [CHANGELOG.md](../../CHANGELOG.md).
