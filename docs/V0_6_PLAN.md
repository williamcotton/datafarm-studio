# Datafarm Studio v0.6.0 Plan

Status: Implemented
Target version: 0.6.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_5_PLAN.md`](V0_5_PLAN.md)
Upstream dependencies: local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages. This release uses the local Algraf
WASM with numeric categorical axis support.

## Purpose

Studio v0.6 keeps the Interactivity page as a working runtime demo and adds a
separate "How Built" teaching page. The new page uses a deliberately small
one-slider example instead of explaining the full Interactivity demo: one React
state value, one PDL param, one input CSV, one generated CSV, one editable PDL
program, one editable Algraf chart, and one direct chart click handler.

The release goal is explanatory: make the reactive architecture visible without
duplicating the full demo, adding an abstraction layer, or changing the shipped
runtime behavior.

## Must

- Preserve the existing Interactivity demo behavior.

  Status: Implemented. PDL context controls, generated CSV output, selector and
  dependent Algraf charts, editable sources, diagnostics, and chart click event
  routing MUST keep their existing behavior.

- Add a separate "How Built" page.

  Status: Implemented. The page MUST be reachable from the topbar switcher and
  MUST use a linear single-`App.tsx` style wiring map. It MUST show the input
  CSV, editable PDL and Algraf source, generated CSV, rendered chart, direct
  slider state, direct chart click handling, and Monaco-highlighted TypeScript
  snippets explaining package imports, WASM runtime setup, React state
  management, editor components, view components, runtime API boundaries,
  events, data flow, and the compact rerun model.

- Keep the live teaching example compact and coherent.

  Status: Implemented. The above-fold live surface MUST present the slider,
  input CSV, generated output, chart, and editable PDL/Algraf source as one
  assembled workflow. The Algraf source MUST use `Scale(axis: x, type:
  "categorical")` so numeric `day` values can be positioned as categories,
  `Bar(fill: value, ...)` with a value scale, and click metadata that emits
  `day` directly back into the slider state.

- Keep runtime delegation intact.

  Status: Implemented. The walkthrough MUST describe Studio's use of PDL and
  Algraf runtimes without adding TypeScript implementations of PDL parsing,
  PDL execution, Algraf parsing, or Algraf rendering.

- Keep spec, plan, and package versions aligned.

  Status: Implemented. This plan, `docs/STUDIO_SPEC.md`, `package.json`, and
  `package-lock.json` are updated for Studio v0.6.0.

## Should

- Keep the new page compact.

  Status: Implemented. The walkthrough should use a focused linear layout and
  explanatory panels rather than rebuilding the full demo, adding a wizard
  control, or focusing on production component extraction.

- Preserve local validation speed.

  Status: Implemented. The release should continue to type-check with
  `npm run check` and run through the existing Vite development workflow.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Manual browser verification MUST confirm:

- The Interactivity page still renders the existing controls, charts, generated
  CSV output, and editable sources.
- The new "How Built" page is reachable from the topbar switcher.
- The live teaching example shows the slider, input CSV, editable PDL and
  Algraf source, generated CSV, rendered chart, and direct chart click handler.
- The walkthrough presents imports, WASM setup, state, controls, editor
  components, derived runs, PDL API, Algraf API, views, and event bridge in
  order.
- The code examples render with syntax highlighting.
- Editing the PDL or Algraf source updates the runtime flow.
- Clicking a chart bar updates the same React slider state and regenerates the
  PDL output.
- Clicking the selector chart still updates Studio state and refreshes the
  dependent chart.

## Deferred

- Automated browser smoke tests.
- General project model extraction.
- Route-based navigation.
- Fine-grained execution graph invalidation.
