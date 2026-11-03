# Spec: Food Fight v0.0.3 — Gameplay & Barão 2.0

**Status:** Implemented on `feature/v003`; pending manual review
**Date:** 2026-11-02
**Design sources:** [`FoodFight v0.0.3.dc.html`](../design/project/FoodFight%20v0.0.3.dc.html), [`Versionamento.dc.html`](../design/project/Versionamento.dc.html), and the approved [design record](../superpowers/specs/2026-11-02-foodfight-v003-gameplay-design.md).

## Objective

Extend the v0.0.2 combat loop with a difficulty choice and the v0.0.3 “Jogabilidade & Barão 2.0” behavior while preserving the UI-thread fixed-pool architecture.

## Scope

- Add a native difficulty screen after hero selection.
- Offer Muito Fácil, Fácil, Difícil, and Impossível presets.
- Apply preset speed, spawn interval, double-spawn chance, and acceleration to the UI-thread loop.
- Make normal attacks originate from the Barão's current lane.
- Render the Barão at the 184×198 handoff scale with a purple aura and attack feedback.
- Cross each 100-point score threshold once, grant one capped power charge, and queue three resistant zombie projectiles.
- Clear normal projectiles for the next 40 score points after an accepted power shot; resistant burst projectiles remain active.
- Show Barão taunts while attacking and the existing `bravo` reaction after a successful power hit.
- Render normal projectiles approximately 1.3× and zombie projectiles at 96px.
- Extend deterministic harness coverage for difficulty, milestones, resistant bursts, and lane-origin spawns.

Audio, story mode, map navigation, new villains, skins, inventory, persistence, and later roadmap items are out of scope.

## Flow and state

```text
Loading → Select hero → Choose difficulty → Game → Win/Over
                         ↑                         │
                         └──── switch hero ────────┘
```

`GameState.difficulty` is discrete Zustand state. Replay preserves the selected hero, difficulty, and best score. The engine mirrors the difficulty as a numeric shared value when the match starts; it never reads Zustand per frame.

```ts
type Difficulty = 'mfacil' | 'facil' | 'dificil' | 'impossivel';
```

| Key | Label | Base speed | Spawn interval | Double spawn | Acceleration |
|---|---|---:|---:|---:|---:|
| `mfacil` | Muito Fácil | 215 px/s | 1450 ms | 0% | 0.002 |
| `facil` | Fácil | 300 px/s | 1050 ms | 10% | 0.004 |
| `dificil` | Difícil | 430 px/s | 760 ms | 30% | 0.006 |
| `impossivel` | Impossível | 560 px/s | 540 ms | 55% | 0.009 |

The speed formula is `preset.speed + min(280, elapsedMs * preset.acceleration)`. The spawn interval is `max(400, preset.interval - elapsedMs * 0.003)`.

## Combat rules

- Normal projectile lane: the primary spawn uses the integer lane containing the current Barão centre; an optional second projectile uses the approved adjacent-lane formula from the design handoff.
- Milestone: each crossed 100-point threshold grants one charge, capped at `POWER_MAX_CHARGES`, and queues exactly three resistant zombies in the captured Barão lane.
- Burst timing: one zombie slot is activated every 140 ms from the fixed enemy pool. Pool saturation may skip a request; it may not allocate a dynamic collection.
- Power mode: an accepted shot sets `powerUntilScore = currentScore + 40`. Normal projectiles ahead of the hero are removed and award `SCORE_PER_DODGE`; resistant burst projectiles are not removed by this mode.
- Projectile scale: normal visual/hitbox basis is `CANDY_SIZE * PROJECTILE_SIZE_MULTIPLIER`; zombie basis is `ZOMBIE_RENDER_SIZE`.
- Results: the existing UI-thread freeze, five villain HP, three hero lives, bubble rules, double-fire guard, and result modal remain active.

## Architecture constraints

- Per-frame positions, active flags, difficulty, score, charges, milestone counters, and burst metadata remain Reanimated shared values.
- `useFrameCallback` performs no per-frame allocation.
- Ten enemy slots, three shot slots, one bubble, and pre-mounted projectile variants remain fixed pools.
- `scheduleOnRN` is used only for discrete events: score, hero hit, villain hit, accepted fire, bubble pickup, milestone charge, villain burst, and FPS sample.
- The Skia canvas does not subscribe to score/HUD React updates except for discrete scene/mood changes.
- No new runtime dependency or audio asset is introduced.

## Verification contract

Automated coverage must include:

- all four preset values and fallback behavior;
- screen transition and replay difficulty persistence;
- deterministic difficulty-dependent spawn cadence;
- one charge and one three-zombie burst per crossed milestone;
- resistant burst projectiles surviving power clear mode;
- normal spawn lane matching the Barão lane;
- existing bubble, collision, invulnerability, pool, fire-race, freeze, and result scenarios.

Run before review:

```bash
npm run typecheck
npm run lint
npm test
```

Do not run an Android/native build or generate an APK until manual review of this feature is complete.
