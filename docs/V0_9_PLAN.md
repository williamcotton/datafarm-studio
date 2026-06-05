# Datafarm Studio v0.9.0 Plan

Status: Planned
Target version: 0.9.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_8_PLAN.md`](V0_8_PLAN.md)
Upstream dependencies: local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages. This release is expected to reuse
the Studio SQL workspace from v0.8 and does not require new PDL or Algraf
runtime behavior.

## Purpose

Studio v0.9 reorganizes the app around Datafarm Studio as an IDE while
preserving the existing product content under clearer sections.

The release goal is product-structure work: the first page should introduce
Datafarm as the whole system, the primary app surface should be an IDE, current
Solar and Bikeshare workflows should move under Case Studies, and the existing
How Built content should become the start of a fuller Docs section.

## Must

- Add a Datafarm landing page.

  Status: Planned. Studio MUST add a first-view landing page that introduces
  Datafarm Studio as the browser IDE for the PDL to Algraf workflow. The page
  MUST be separate from the current case-study page surface.

- Add top-level navigation.

  Status: Planned. Studio MUST replace the current story-first switcher model
  with top-level navigation for Landing, IDE, Case Studies, Docs, and any
  retained demo/lab surface needed for Interactivity.

- Make IDE the primary product surface.

  Status: Planned. Studio MUST add an initial IDE page or tab that brings
  together local/manual data, PDL editing, Algraf editing, the v0.8 SQL
  workspace and SQL editor, output preview, runtime status, and diagnostics.

- Move existing stories under Case Studies.

  Status: Planned. Solar and Bikeshare MUST remain functional but move under a
  Case Studies section. Their raw data editors, PDL preparation code, prepared
  CSV output, Algraf chart code, rendered charts, evidence, and conclusions
  MUST keep their existing runtime behavior.

- Move How Built into Docs.

  Status: Planned. The current How Built walkthrough MUST move into a Docs
  section and remain reachable after navigation changes.

- Expand the Docs section.

  Status: Planned. Docs MUST include at least a Datafarm overview, PDL basics,
  Algraf basics, browser runtime model, interactivity model, and SQL workspace
  notes from v0.8.

- Preserve the Interactivity demo.

  Status: Planned. The existing Interactivity demo MUST remain reachable either
  from Docs, IDE, or a Labs/Demos section, and its PDL context controls,
  generated CSV output, selector and dependent Algraf charts, editable sources,
  diagnostics, and chart click event routing MUST keep their existing behavior.

- Keep runtime delegation intact.

  Status: Planned. This release MUST NOT add TypeScript implementations of PDL
  parsing/execution or Algraf parsing/rendering.

## Should

- Keep the reorganization incremental.

  Status: Planned. The first IDE surface should be client-side and ephemeral,
  reusing existing editor/runtime components plus the v0.8 SQL workspace and
  SQL editor rather than introducing persistence or a full project manifest.

- Preserve product content while changing ownership.

  Status: Planned. Case-study copy, evidence, and story assets should remain
  separate from reusable IDE, docs, runtime, and editor infrastructure.

- Make future project-model work easier.

  Status: Planned. Navigation, page state, and shared panels should be shaped so
  a later project model can replace fixed examples without another app rewrite.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Run `npm run build` when validating final release packaging, static WASM asset
paths, deployment behavior, or GitHub Pages readiness.

Manual browser verification MUST confirm:

- The landing page is the first product surface.
- Top-level navigation reaches IDE, Case Studies, Docs, and any retained
  Demos/Labs surface.
- The IDE page loads PDL, Algraf, the SQL workspace, and the SQL editor without
  changing runtime delegation.
- Solar and Bikeshare still render prepared CSV output and charts under Case
  Studies.
- Docs includes the moved How Built content and the new overview/runtime/SQL
  documentation sections.
- Interactivity remains reachable and keeps its reactive behavior.
- Runtime status and diagnostics remain visible in the relevant surfaces.

## Deferred

- Persistent project storage.
- Canonical project manifest.
- Browser-local project save/load.
- Remote projects or collaboration.
- Server backend.
- Source control integration.
- Automated browser smoke tests.
