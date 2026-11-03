# FoodFight v0.0.4 — "The Baron Talks (and Explodes)"

**Status:** Approved for planning  
**Branch:** `feature/v004`  
**Baseline:** `v0.0.2` on `master`, with the validated `v0.0.3` release tag incorporated before implementation  
**Design source:** `docs/design/project/FoodFight v0.0.4.dc.html` and the versioning handoff from the supplied design bundle

## Objective

Build the v0.0.4 gameplay feature on top of the validated v0.0.3 combat baseline. The feature makes the Barão Brigadeiro presentation more expressive and turns the power button into a readable, high-impact, full-screen action while preserving the UI-thread game-loop architecture.

The player should be able to select a hero, choose a fixed difficulty, dodge typed sweets, collect food bubbles, fire a charged power, see the Barão type and speak, watch zombies laugh, and see a complete defeat animation before the victory result appears.

## Scope

### Baseline incorporated from v0.0.3

- Difficulty selection with Muito Fácil, Fácil, Difícil, and Impossível.
- Fixed difficulty for the whole match; difficulty is selected before gameplay and does not ramp with score.
- Barão movement and attack bursts originating from his current lane.
- Click/tap lane control in addition to swipe and arrow-key control.
- UI-thread-authorized power firing with a local charge mirror and a fixed shot pool.
- Villain taunts, ouches, mood feedback, milestone bursts, and typed enemy variants.

### v0.0.4 additions

1. **Power is obtained only from food bubbles.** The automatic power charge at each score milestone is removed. A food bubble is queued at every 100-point threshold, one bubble at a time, and a collected bubble grants one charge up to the cap of three.
2. **Power is a full-screen clear.** An accepted power clears every visible active enemy, including zombie attacks, creates a confetti effect at each cleared obstacle, and awards 10 points per cleared obstacle. The previous 40-point power window is removed.
3. **Power control is redesigned.** The button is a 126 px circular control in the lower-right corner with a rotating gold ring while a charge is available. It remains outside the gameplay gesture surface.
4. **Villain dialogue is typed.** Taunts, ouches, and defeat dialogue appear at 65 ms per character. The Barão has a talking mouth while text is being revealed; the dialogue uses the existing Fredoka font and no new runtime dependency.
5. **Zombies laugh.** Zombie sprites have an animated mouth and a looping `HA HA HA!` label rendered inside their fixed slot.
6. **The Barão is larger.** The gameplay villain is rendered at the v0.0.4 handoff size of 224 × 242 px, with its vertical position still driven by the UI-thread motion value.
7. **Defeat is staged.** The final accepted hit freezes gameplay, starts the Barão inflate/shake/spin defeat animation, emits the fixed confetti pool around the villain, and transitions to the victory result only after the defeat sequence completes.

## Explicit decisions

- Incorporate the existing `v0.0.3` tag rather than reimplementing its mechanics independently. The v0.0.4 branch must contain the v0.0.3 baseline plus the delta above.
- Keep the game loop in `src/hooks/useRunnerEngine.ts`; per-frame positions, active flags, animation clocks, and collision mirrors remain Reanimated shared values on the UI thread.
- Keep pools fixed and mounted once. v0.0.4 uses 12 fixed enemy slots, 3 power-shot slots, 1 bubble slot, and 8 fixed confetti slots, matching the v0.0.4 design handoff. Pool saturation skips the request and emits a deterministic harness event.
- Use the design HTML as the source of truth for character geometry, colours, dimensions, and animation timings. Code ports the geometry; it does not invent replacement assets.
- Use the existing Fredoka package for dialogue text. No audio package or new dependency is part of v0.0.4.
- Preserve the existing UI-thread fire guard: a double tap cannot spend one charge twice. The UI thread accepts a fire only when a charge mirror and a free shot slot are both available, then bridges `applyPowerFired(index)` to JS.
- Treat the staged defeat as a terminal state. Once the final hit is accepted, no enemy, score, or second terminal event may mutate the match while the defeat animation is running.

## Behaviour contract

### Power and bubble flow

```text
score reaches 100-point threshold
  -> queue one food bubble if no bubble is active
  -> do not grant a charge automatically

hero overlaps the bubble
  -> deactivate bubble
  -> charges = min(charges + 1, 3)

player presses PODER!
  -> UI thread validates charge and free shot slot
  -> consume one charge and advance powerIndex
  -> clear all visible active enemies, including zombies
  -> emit one confetti effect per cleared enemy when a pool slot is available
  -> award 10 points for each cleared enemy
```

Cleared enemies are marked as scored before the bridge returns to JS so a later despawn cannot award the same points again. The power projectile still travels toward the Barão and applies one villain hit when it reaches him; the screen clear does not itself damage the villain.

### Dialogue

- Opening taunt starts 800 ms after gameplay begins.
- A normal taunt holds for 2,800 ms after typing completes.
- An ouch holds for 2,200 ms and sets the villain mood to `bravo` for 1,400 ms; the villain shake lasts 450 ms.
- The defeat line remains visible during the 2,500 ms defeat sequence.
- A new dialogue request cancels the previous typewriter timer before starting.
- Text updates are discrete JS-side updates; no dialogue value is sampled or allocated inside the frame worklet.

### Defeat sequence

```text
final accepted shot
  -> local UI-thread freeze
  -> villainDying = true
  -> hide normal gameplay motion and start ff-vildie-equivalent animation
  -> schedule fixed confetti events around the villain
  -> after 2,500 ms, transition to screen = 'win'
```

The result modal is rendered over the frozen scene. A stale hero hit, enemy despawn, or second shot cannot turn the result into `over` or decrement villain HP again.

## Architecture and project structure

The feature keeps the existing boundaries:

```text
App.tsx                         app shell, font loading, screen flow
src/features/difficulty/        v0.0.3 difficulty screen
src/features/game/GameScreen.tsx static Skia scene and overlay controls
src/hooks/useRunnerEngine.ts    UI-thread loop, fixed pools, collision, terminal gates
src/engine/combatSimulation.ts  deterministic headless port used by harness tests
src/store/gameStore.ts          discrete Zustand projection and event guards
src/render/candies/             Candy, FoodBubble, PowerShot, Zombie, ZombieLaugh
src/render/foodie/               character geometry and villain presentation
src/types/constants.ts            named gameplay constants
docs/specs/                      feature specifications
docs/plans/                      implementation plans
docs/design/                     design handoff source of truth
```

The engine must not allocate arrays, objects, or closures per frame. The harness may use ordinary arrays outside the worklet, but it must call the same exported combat formulas and use the same spawn coordinates, burst timestamps, pool sizes, and score rules as production.

## Constants

All values are named constants; literals are not duplicated across the engine, renderer, and harness.

| Constant | v0.0.4 value | Purpose |
| --- | ---: | --- |
| `BUBBLE_EVERY` | 100 | Score threshold that queues a food bubble |
| `POWER_MAX_CHARGES` | 3 | Maximum stored powers |
| `ENEMY_POOL_SIZE` | 12 | Fixed typed enemy slots |
| `POWER_SHOT_POOL_SIZE` | 3 | Fixed power-shot slots |
| `BURST_EFFECT_POOL_SIZE` | 8 | Fixed confetti slots |
| `BURST_EFFECT_DURATION_MS` | 620 | Confetti visibility duration |
| `VILLAIN_RENDER_WIDTH` | 224 | Gameplay villain width |
| `VILLAIN_RENDER_HEIGHT` | 242 | Gameplay villain height |
| `VILLAIN_DEFEAT_DURATION_MS` | 2500 | Delay before the win result |
| `DIALOGUE_CHAR_INTERVAL_MS` | 65 | Typewriter cadence |
| `VILLAIN_OUCH_DURATION_MS` | 2200 | Ouch dialogue hold |
| `VILLAIN_TAUNT_DURATION_MS` | 2800 | Taunt dialogue hold |
| `VILLAIN_TALK_DELAY_MS` | 800 | Opening taunt delay |
| `VILLAIN_BRAVO_DURATION_MS` | 1400 | Ouch mood duration |
| `VILLAIN_SHAKE_DURATION_MS` | 450 | Ouch shake duration |
| `VILLAIN_BURST_DELAYS_MS` | `[160, 460, 760]` | Hand-off burst offsets |
| `POWER_SHOT_SPEED` | 620 px/s | Power projectile speed |
| `SCORE_PER_DODGE` | 10 | Score per dodge or cleared enemy |

## Testing strategy

### Unit and store tests

- verify the 100-point threshold queues a bubble without granting a charge;
- verify bubble collection increments charges and caps at three;
- verify a full-screen power clears normal enemies and zombies and awards exactly 10 per enemy;
- verify clearing an already-scored slot does not double-score it;
- verify the fire guard rejects a double fire with one charge;
- verify dialogue durations, typewriter cancellation, and villain mood transitions;
- verify final villain hit enters the staged defeat state and only the completion event transitions to `win`;
- verify terminal guards reject late hero hits and villain hits.

### Deterministic harness tests

The headless harness uses a seeded PRNG and production formulas. It must cover:

- bubble thresholds at 100, 200, and 300 points;
- full-screen clear with mixed normal and zombie slots;
- confetti pool saturation and `spawnSkipped` events;
- villain burst timestamps and spawn lane/source alignment;
- single-charge double-fire rejection;
- staged defeat and delayed victory;
- no score or life mutation after terminal freeze.

### Static and manual verification

```text
npm test
npm run typecheck
npm run lint
```

Manual review must verify the four difficulty cards, the 126 px power control, the circular charge ring, typed dialogue and moving mouth, zombie laughter, centered confetti, the larger Barão, and the defeat animation before the victory modal. Device performance is measured with the project protocol (`dumpsys gfxinfo` on Android), never with the in-app loop-rate readout.

## Commands

```text
npm test
npm run typecheck
npm run lint
npx expo start
npx eas-cli@latest build --platform android --profile preview --non-interactive
```

## Boundaries

- **Always:** preserve fixed pools, keep per-frame values off Zustand, use named constants, update docs and changelog, and run tests/typecheck/lint before claiming completion.
- **Ask first:** add a new runtime dependency, add audio playback, change the CI/build profile, alter the public release flow, or broaden the feature into v0.0.5/v0.0.6 content.
- **Never:** move gameplay positions into React state, allocate inside the frame worklet, invent character geometry that is absent from the design handoff, commit the unrelated `docs/design/project/support.js` change, or delete historical version documentation.

## Success criteria

- [ ] `feature/v004` contains the validated v0.0.3 baseline and the v0.0.4 delta.
- [ ] The v0.0.4 design HTML is present in `docs/design/project/` and indexed.
- [ ] Power charges come only from collected bubbles at 100-point thresholds.
- [ ] An accepted power clears every visible enemy, including zombies, with centered confetti and correct scoring.
- [ ] Dialogue types at 65 ms per character and drives a talking mouth without per-frame React state.
- [ ] Zombies visibly laugh, the Barão uses the 224 × 242 handoff size, and the defeat sequence completes before victory.
- [ ] Production and harness share spawn order, coordinates, timings, pool sizes, scoring, and terminal guards.
- [ ] `npm test`, `npm run typecheck`, and `npm run lint` pass.
- [ ] The final review records manual gaps separately from automated verification.

## Open questions

None for the v0.0.4 scope. Audio, map progression, additional villains, inventories, persistence, pause, and hero-specific power mechanics remain outside this feature and belong to later versioned work.
