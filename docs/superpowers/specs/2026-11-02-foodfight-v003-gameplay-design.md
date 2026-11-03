# Food Fight v0.0.3 Gameplay Design

**Status:** Approved for implementation
**Date:** 2026-11-02
**Design sources:** [`FoodFight v0.0.3.dc.html`](../../design/project/FoodFight%20v0.0.3.dc.html), [`Versionamento.dc.html`](../../design/project/Versionamento.dc.html), and the existing v0.0.2 architecture.

## Goal

Turn the v0.0.2 combat loop into the v0.0.3 “Jogabilidade & Barão 2.0” experience by adding a difficulty choice and making the Barão's position, attack animation, score milestones, and reactions affect gameplay without breaking the UI-thread frame-loop invariants.

## Scope

The feature includes:

- A difficulty screen between hero selection and gameplay.
- Four difficulty presets: Muito Fácil, Fácil, Difícil, and Impossível.
- Difficulty-specific projectile speed, spawn interval, double-spawn probability, and acceleration.
- A larger Barão presentation with purple aura and a belly-attack animation.
- Projectile spawns originating from the Barão's current lane.
- A three-projectile zombie burst at every 100-point score milestone.
- One power charge granted at every 100-point milestone, capped by the existing charge limit.
- Power mode that clears normal projectiles for the next 40 score points and awards +10 per cleared projectile; villain burst projectiles resist it.
- Villain taunts while attacking and an angry reaction after a power hit.
- Projectiles rendered approximately 30% larger than the v0.0.2 baseline and zombie projectiles rendered at 96px.
- Deterministic tests for difficulty, milestone behavior, power clearing, and spawn lanes.
- Updated architecture, testing, README index, changelog, and implementation plan documentation.

The feature does not include audio, story mode, map navigation, new villains, skins, inventory, persistence, or the later version roadmap items shown in the design bundle.

## User flow

```text
Loading → Select hero → Choose difficulty → Game → Win/Over
                         ↑                         │
                         └──── switch hero ────────┘
```

The existing result modal remains layered over the frozen game scene. Replay uses the last selected difficulty; switching hero returns to hero selection.

## Decisions

### Difficulty model

Difficulty is discrete match state. The selected key is stored in Zustand because the selection screen and HUD render its label. The hot loop reads a matching UI-thread mirror when the match resets; it does not read Zustand on every frame.

| Key | Label | Base speed | Spawn interval | Double spawn | Acceleration |
|---|---|---:|---:|---:|---:|
| `mfacil` | Muito Fácil | 215 px/s | 1450 ms | 0% | 0.002 |
| `facil` | Fácil | 300 px/s | 1050 ms | 10% | 0.004 |
| `dificil` | Difícil | 430 px/s | 760 ms | 30% | 0.006 |
| `impossivel` | Impossível | 560 px/s | 540 ms | 55% | 0.009 |

The speed ramp is derived from elapsed game time and the selected preset. Spawn interval has a floor of 400 ms. Difficulty does not change during a match.

### Barão and attacks

- The Barão's visual target is 184×198 px with the supplied purple aura treatment.
- Its vertical position follows the existing sine-like UI-thread motion, clamped to the playfield margins.
- Normal projectiles use the current Barão lane at spawn time.
- At each 100-point milestone, the engine schedules three zombie projectiles from the current Barão lane with staggered delays. The burst is represented by fixed pool slots and cannot allocate in the frame callback.
- The Barão shows an attack animation and a taunt when the burst begins.
- A successful power shot changes the mood to `bravo` for the existing short reaction window and shows an ouch line.

### Score and power mode

- Dodged or power-cleared projectiles award +10.
- Every 100-point milestone grants one power charge, capped at the existing maximum.
- The milestone is consumed once, then the next threshold is queued.
- An accepted power shot activates a 40-point clear mode.
- During clear mode, normal projectiles in front of the hero are removed and award +10; villain burst projectiles are marked resistant and continue normally.
- Existing UI-thread fire authorization remains the source of truth for charge consumption and double-tap safety.

### Rendering and performance

- Per-frame positions, active flags, score mirror, charge mirror, and milestone counters remain Reanimated shared values.
- The fixed enemy, shot, and effect pools remain mounted once. Visibility/opacity toggles do not create or destroy React elements in the frame loop.
- New HUD and difficulty-screen values update only on discrete store changes.
- No audio or new runtime dependency is introduced in v0.0.3.

## File responsibilities

| Area | Responsibility |
|---|---|
| `src/types/game.ts` | Difficulty union, game-state field, and action contracts. |
| `src/constants/game.ts` | Named v0.0.3 difficulty and milestone constants. |
| `src/store/gameStore.ts` | Selected difficulty, match reset/replay, and guarded discrete actions. |
| `src/features/select/` | Hero selection plus navigation to difficulty selection. |
| `src/features/difficulty/` | Four-card difficulty selection screen. |
| `src/features/game/GameScreen.tsx` | Pass selected difficulty into the engine and render the updated pools/Barão. |
| `src/hooks/useRunnerEngine.ts` | UI-thread difficulty mirror, Barão movement, milestone burst, power mode, and projectile sizing. |
| `src/engine/combatMath.ts` | Pure worklet-safe difficulty and milestone formulas. |
| `src/engine/combatSimulation.ts` | RN-free deterministic v0.0.3 harness scenarios. |
| `src/hud/Hud.tsx` | Difficulty label, existing score/HP/charges, and power feedback. |
| `docs/specs/2026-11-02-foodfight-v003-gameplay.md` | Canonical implementation contract. |
| `docs/plans/2026-11-02-foodfight-v003-gameplay.md` | Repository plan for implementation. |
| `docs/architecture.md` and `docs/testing.md` | Updated runtime and verification contracts. |

## Acceptance criteria

- A player can choose each of the four difficulties after choosing a hero.
- The chosen difficulty is visible in the game HUD and remains selected on replay.
- Projectile movement and spawn cadence differ according to the selected preset.
- Normal attacks originate from the Barão's current lane.
- Every 100 points triggers exactly one three-zombie burst and one capped power-charge grant.
- Power mode clears only non-resistant projectiles for the next 40 points.
- The Barão attack and `bravo` feedback are visible without changing the fixed-pool architecture.
- Existing win, over, replay, hero-switch, fire-race, bubble, and freeze behavior remains intact.
- `npm run typecheck`, `npm run lint`, and `npm test` pass.
- No APK or native build is run before manual review of the implementation.

## Alternatives considered

1. **Implement directly in the existing engine (chosen).** Preserves the v0.0.2 performance architecture and makes the new behavior testable through the existing headless harness.
2. **Create a separate v0.0.3 gameplay engine.** Rejected because it would duplicate collision, pooling, result, and bridge logic and make fixes diverge.
3. **Implement only the difficulty screen first.** Rejected because the design's value depends on difficulty changing actual gameplay and Barão behavior in the same feature.
