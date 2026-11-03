# Documentation

Everything written about Food Fight, indexed. Start here.

The project has two eras: the **POC** that tested React Native Skia, and the **game** (v0.0.1 onward) that replaced it. The current game feature is v0.0.3; the POC's frame-rate verdict is unresolved; see [results.md](./results.md). Docs describe the game unless they say otherwise.

---

## Core documents

| Document                                   | What it covers                                                            | Read time |
| ------------------------------------------ | ------------------------------------------------------------------------- | --------- |
| [architecture.md](./architecture.md)       | How the v0.0.3 game is built and why each decision was made               | 20 min    |
| [testing.md](./testing.md)                 | The v0.0.3 validation protocol — automated checks pass; device QA pending | 12 min    |
| [troubleshooting.md](./troubleshooting.md) | Symptom → cause → fix                                                     | reference |
| [results.md](./results.md)                 | POC measurements and the unresolved frame-rate verdict                    | 8 min     |

Project entry point and quick start live in the [root README](../README.md). Version history is in the [changelog](../CHANGELOG.md).

---

## Design

[`design/`](./design/) holds the design handoff bundle — HTML prototypes, the style guide, and character geometry.

**It is the source of truth for shapes and colours**, not the code. `src/render/foodie/characters/*` port coordinates verbatim from `design/project/Foodie.dc.html`; visual changes start there and are ported, never the other way round.

---

## Specs

Written before implementation, one per feature.

| Spec | Subject |
|---|---|
| [2026-07-05-foodfight-v001-design.md](./specs/2026-07-05-foodfight-v001-design.md) | **v0.0.1 game design** — heroes, villain, screens, theme |
| [2026-11-02-foodfight-v002-combat.md](./specs/2026-11-02-foodfight-v002-combat.md) | **v0.0.2 combat loop** — attacks, powers, food bubble, victory/defeat, pools and harness |
| [2026-11-03-foodfight-v004-design.md](./specs/2026-11-03-foodfight-v004-design.md) | **v0.0.4 gameplay** — full-screen power, typed villain dialogue, laughing zombies, and staged defeat |
| [2026-11-02-foodfight-v003-gameplay-design.md](./specs/2026-11-02-foodfight-v003-gameplay-design.md) | **v0.0.3 approved design record** — difficulty, Barão 2.0, milestones and reactions |
| [2026-11-02-foodfight-v003-gameplay.md](./specs/2026-11-02-foodfight-v003-gameplay.md) | **v0.0.3 gameplay** — difficulty screen, Barão 2.0, milestones, bursts and power clear mode |
| [poc-runner-skia.md](./specs/poc-runner-skia.md) | The original POC specification and acceptance criteria |
| [2026-07-04-play-again-button.md](./specs/2026-07-04-play-again-button.md) | Game Over modal and replay flow |
| [2026-07-04-orientation.md](./specs/2026-07-04-orientation.md) | Orientation selection *(superseded — v0.0.1 locks landscape)* |
| [2026-07-04-dopamine-loader.md](./specs/2026-07-04-dopamine-loader.md) | POC loading screen *(superseded by the themed loader)* |

## Plans

Step-by-step implementation plans derived from the specs above.

| Plan | Subject |
|---|---|
| [2026-07-05-foodfight-v001.md](./plans/2026-07-05-foodfight-v001.md) | **v0.0.1 game implementation** |
| [2026-11-02-foodfight-v002-combat.md](./plans/2026-11-02-foodfight-v002-combat.md) | **v0.0.2 combat implementation** |
| [2026-11-03-foodfight-v004.md](./plans/2026-11-03-foodfight-v004.md) | **v0.0.4 gameplay implementation** |
| [2026-11-02-foodfight-v003-gameplay.md](./plans/2026-11-02-foodfight-v003-gameplay.md) | **v0.0.3 gameplay implementation** |
| [2026-07-04-play-again-button.md](./plans/2026-07-04-play-again-button.md) | Game Over modal (POC) |
| [2026-07-04-dopamine-loader.md](./plans/2026-07-04-dopamine-loader.md) | Loading screen (POC) |

---

## Where to go

**Running it for the first time** → [root README → Quick start](../README.md#quick-start)

**Changing gameplay code** → [architecture.md](./architecture.md) first. The frame loop has two invariants that are easy to break silently: no per-frame React state, and no allocation inside the worklet.

**Changing how something looks** → [`design/`](./design/) first, then port.

**Testing on a device** → [testing.md](./testing.md). The released v0.0.1 baseline, v0.0.2 combat scene, and v0.0.3 enlarged Barão scene still need physical-device measurement; that is the largest open item on the project.

**Something is broken** → [troubleshooting.md](./troubleshooting.md)

**Wondering why the stack is what it is** → [results.md](./results.md)

---

## Archive

[`archive/`](./archive/) holds the seven superseded documents from the pre-restructure layout. They contain **inaccurate descriptions of the codebase** and are kept only for historical reference. Do not use them as a guide.

---

## Conventions

- Docs are written in English. Technical terms stay in their original form (worklet, hitbox, frame budget).
- Specs and plans are prefixed with their date: `YYYY-MM-DD-slug.md`.
- Every user-visible change gets a `CHANGELOG.md` entry under `[Unreleased]` before release.
- When code and docs disagree, the code is right and the doc is a bug.
