# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Documentation

All docs live in `docs/`, indexed by `docs/README.md`. Do not add markdown files to the repo root — the only ones that belong there are `README.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md` and `LICENSE`.

- Written in English. Technical terms stay in their original form (worklet, hitbox, frame budget).
- Specs go in `docs/specs/`, implementation plans in `docs/plans/`, both named `YYYY-MM-DD-slug.md`.
- `docs/design/` is the design handoff bundle and the **source of truth for shapes and colours**. Character geometry in `src/render/foodie/characters/*` is ported verbatim from it. Visual changes start there and are ported into code, never the reverse.
- `docs/archive/` is obsolete and partly inaccurate. Never cite it as a source of truth.
- When code and docs disagree, the code is right and the doc is a bug. Fix the doc.

Before documenting how something works, read the implementation. The archived docs exist because the previous set described a `systems/` layer that was never built.

# Changelog

Every user-visible change gets an entry in `CHANGELOG.md` under `[Unreleased]`, following Keep a Changelog. Versions are POC milestones, not a public API: MAJOR = the POC's verdict changes, MINOR = a feature or screen, PATCH = fixes, refactors, docs, tuning.

# Commits

Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) for the subject line.

The body is **bullet points, never prose paragraphs**. One bullet per change, starting with a verb. Group additional detail under named sections:

```
docs: conclude POC with ARM device testing results

- Add POC-CONCLUSION.md with final results, discoveries, and recommendations
- Update README.md with ARM test results and FPS limitations
- Document that FPS < 60 is an engine limitation, not a bug

Testing Results:

- Device: Android ARM (physical device)
- Build: Release APK after optimizations
- Findings: FPS < 60 is Reanimated 3 + Skia limitation on mid-range ARM
```

# Gameplay code

`src/hooks/useRunnerEngine.ts` runs the entire game loop in a UI-thread worklet. Two invariants hold it up, and both are easy to break silently:

1. **Per-frame values never enter React state.** They live in Reanimated shared values read directly by Skia. Moving hero or obstacle positions into Zustand will destroy the frame rate.
2. **The frame loop allocates nothing.** Obstacles come from a fixed pool toggled via `opacity`. Creating objects or arrays inside the worklet reintroduces GC pressure.

Read `docs/architecture.md` before changing the loop.
