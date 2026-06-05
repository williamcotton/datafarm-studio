# Datafarm Studio v0.7.0 Plan

Status: Implemented
Target version: 0.7.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_6_PLAN.md`](V0_6_PLAN.md)
Upstream dependencies: local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages. This release does not require new
PDL or Algraf runtime behavior.

## Purpose

Studio v0.7 records and lands the narrow data-editor theme alignment needed
before larger IDE work continues.

The release goal is maintenance-focused: CSV and JSON data editors should use
the shared Datafarm Monaco theme instead of defining a local duplicate theme in
`src/DataEditor.tsx`. This keeps raw data, generated data, PDL, Algraf, and
documentation snippet editor surfaces visually consistent and prevents Monaco's
global theme registration order from changing token colors as pages mount.

## Must

- Share the Datafarm editor theme.

  Status: Implemented. `src/DataEditor.tsx` MUST import and use the shared
  `DATAFARM_EDITOR_THEME` and `DATAFARM_EDITOR_THEME_NAME` values from
  `src/editorTheme.ts`.

- Remove the local data-editor theme definition.

  Status: Implemented. `src/DataEditor.tsx` MUST NOT keep its own duplicate
  Monaco theme colors for CSV and JSON editors.

- Preserve existing data editor behavior.

  Status: Implemented. CSV and JSON data editors MUST keep their existing value
  synchronization, Monaco model URI handling, editor disposal, language mode,
  sizing, font, wrapping, and change-callback behavior.

- Keep runtime delegation intact.

  Status: Implemented. This release MUST NOT add TypeScript implementations of
  PDL parsing/execution, Algraf parsing/rendering, CSV parsing, or JSON
  analysis.

## Should

- Keep the change intentionally small.

  Status: Implemented. The release should avoid broad editor refactors, new
  dependencies, navigation changes, SQL support, or project-model work.

- Document the editor-theme contract.

  Status: Implemented. `docs/STUDIO_SPEC.md` states that Studio's CSV and
  JSON Monaco data editors use the same shared editor theme as the PDL and
  Algraf editor surfaces.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Validation status: Completed on 2026-06-05.

Observed results:

- `npm run check` passed.
- Solar and Bikeshare raw data editors rendered with the shared Datafarm editor
  theme.
- Interactivity rendered its CSV data editor with the shared Datafarm editor
  theme.
- PDL and Algraf token colors remained stable after switching stories, visiting
  Interactivity, visiting How Built, and returning to Solar.

Manual browser verification MUST confirm:

- Solar raw data editors render with the shared Datafarm editor theme.
- Bikeshare raw data editors render with the shared Datafarm editor theme.
- PDL and Algraf editor colors remain stable after switching stories.
- Visiting Interactivity and How Built does not cause editor token colors to
  change due to Monaco theme registration order.

## Deferred

- SQL.js browser workspace.
- IDE and navigation reorganization.
- General project model extraction.
- Route-based navigation.
- Automated browser smoke tests.
