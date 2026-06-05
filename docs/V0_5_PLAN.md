# Datafarm Studio v0.5.0 Plan

Status: Implemented
Target version: 0.5.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_4_PLAN.md`](V0_4_PLAN.md)
Upstream dependencies: local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages. The consumed PDL surface treats
`state` as a declaration keyword, so bundled PDL sources that read a CSV column
named `state` must use backtick-escaped column references.

## Purpose

Studio v0.5 is a maintenance release that preserves the v0.4 story and
interactivity behavior while splitting the large `src/App.tsx` module into
focused components, shared types, runtime workflow helpers, and demo constants.
It also keeps the Solar story compatible with the current PDL keyword set by
escaping its `state` data column in PDL source.

The release goal is structural: make Studio easier to evolve toward the IDE
surface without changing the shipped story, runtime, editor, or interactivity
contracts.

## Must

- Preserve shipped Studio behavior.

  Status: Implemented. Solar, Bikeshare, and the Interactivity page MUST keep
  their existing runtime loading, source editing, prepared CSV, chart rendering,
  diagnostics, story switching, and reactive event flow behavior.

- Split `src/App.tsx` into focused modules.

  Status: Implemented. `App.tsx` MUST remain the top-level state and runtime
  orchestration container. Story rendering, story sections, shared shell
  controls, interactivity rendering, workflow helpers, shared types, constants,
  and formatting utilities MUST live in separate modules under `src/`.

- Keep runtime delegation intact.

  Status: Implemented. The refactor MUST NOT add TypeScript implementations of
  PDL parsing/execution or Algraf parsing/rendering. PDL and Algraf language
  behavior MUST remain delegated to the sibling editor and WASM packages.

- Keep Solar PDL compatible with the current keyword set.

  Status: Implemented. Solar story PDL sources and visible story snippets MUST
  backtick the `state` CSV column when it is referenced as a PDL column name.
  CSV headers and Algraf field references remain `state`; only PDL source
  references need escaping.

- Keep spec, plan, package versions, and layout docs aligned.

  Status: Implemented. This plan, `docs/STUDIO_SPEC.md`, `package.json`,
  `package-lock.json`, README layout notes, and local agent layout guidance are
  updated with the v0.5 module split.

## Should

- Keep extraction boundaries conservative.

  Status: Implemented. The extracted modules should follow existing React
  function component patterns and avoid broad abstractions beyond the current
  shell, story, interactivity, workflow, type, and utility boundaries.

- Preserve local validation speed.

  Status: Implemented. The refactor should continue to type-check with
  `npm run check` and run through the existing Vite development workflow.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Run `npm run build` when validating final release packaging, downloaded WASM
assets, deployment behavior, or GitHub Pages readiness.

Manual browser verification MUST confirm:

- PDL and Algraf runtime status pills reach ready state.
- Solar renders prepared CSV output and charts with the escaped `state` column
  references.
- Story switching still clears snapshots and runs the selected story.
- Bikeshare renders prepared CSV output and charts.
- The Interactivity page renders generated CSV output and both charts.
- Clicking the selector chart updates Studio state and refreshes the dependent
  chart from regenerated PDL output.
- Runtime errors and diagnostics remain visible.

## Deferred

- Automated browser smoke tests.
- General project model extraction.
- Route-based navigation.
- Fine-grained execution graph invalidation.
