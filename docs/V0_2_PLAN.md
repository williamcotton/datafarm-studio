# Datafarm Studio v0.2.0 Plan

Status: Planned
Target version: 0.2.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_1_PLAN.md`](V0_1_PLAN.md)
Upstream dependency: `../pdl/docs/V0_26_PLAN.md`

## Purpose

Studio v0.2 migrates the browser app and bundled case studies to the PDL v0.26
syntax cleanup. PDL v0.26 removes quoted column references, reserves double
quotes for string/path literals, introduces backtick-escaped column references,
and replaces `as` aliases with left-hand assignment in column-producing stages.

This plan intentionally owns only the Studio rollout. The PDL language,
parser/runtime, editor-service ABI behavior, formatter, diagnostics, and PDL
WASM implementation are tracked in the sibling PDL repository.

## Must

- Consume a v0.26-compatible PDL WASM runtime.

  Status: Planned. Studio validation MUST use either locally built sibling PDL
  artifacts copied with `npm run copy:wasm` or a released PDL WASM asset that
  implements the v0.26 grammar. The chosen source MUST be recorded before this
  plan is marked landed.

- Migrate bundled PDL story sources.

  Status: Planned. Solar and Bikeshare root `story.pdl` files and per-section
  `.pdl` files MUST use bare column references, backtick-escaped non-simple
  columns, and assignment-form `select`, `rename`, `mutate`, and `agg` syntax.

- Keep story metadata and generated outputs aligned.

  Status: Planned. Section `outputName`, `dataFile`, supporting files,
  supporting outputs, checked-in CSV outputs, and `src/storyBundles.ts` MUST
  remain consistent with migrated PDL sources. Checked-in CSVs should change
  only when rerunning the migrated pipelines changes deterministic output.

- Update Studio's static PDL grammar copy.

  Status: Planned. `src/grammars/` MUST highlight bare columns,
  backtick-escaped column references, string/path literals, and assignment-form
  aggregate/select/rename syntax consistently with the consumed PDL runtime.

- Preserve runtime and editor-service delegation.

  Status: Planned. Studio MUST continue to route parsing, execution,
  diagnostics, hover, completion, formatting, semantic tokens, symbols,
  definition/reference, and rename through PDL WASM/editor-service calls rather
  than implementing PDL semantics in TypeScript.

## Should

- Update Studio documentation when the migration lands.

  Status: Planned. `docs/STUDIO_SPEC.md`, README snippets, and any user-facing
  copy that shows PDL should reflect v0.2 behavior once the migrated runtime and
  stories are committed.

- Preserve the v0.1 case-study workflow.

  Status: Planned. Story switching, section-level execution, named-output
  routing, prepared CSV display, Algraf chart rendering, and diagnostics should
  behave the same after the syntax migration.

- Make cross-repo assumptions explicit.

  Status: Planned. Any release note or PR should state whether validation used
  local sibling WASM artifacts, downloaded release assets, or a pinned future
  PDL release.

## Validation

Required checks before this plan can be marked landed:

```bash
npm run copy:wasm
npm run check
```

Run `npm run build` when validating release packaging, downloaded WASM assets,
deployment behavior, or final GitHub Pages readiness.

Manual browser verification MUST confirm:

- PDL and Algraf runtime status pills reach ready state.
- Solar and Bikeshare story-level PDL programs execute successfully.
- Per-section PDL execution still works after edits.
- Prepared CSV outputs populate the prepared data panels.
- Prepared CSV files are available to Algraf charts.
- Charts render for both stories.
- PDL diagnostics, hover, completion, semantic tokens, symbols, and
  rename/reference behavior still come from the upstream PDL editor service.

## Deferred

- General Studio project model.
- Project explorer and file tabs.
- Data catalog and schema inspector.
- Execution graph and run history.
- Diagnostics panel.
- Persisted local or remote projects.
- Publication manifest.
- Automated unit tests and browser smoke tests.
