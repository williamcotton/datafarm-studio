# Datafarm Studio v0.10.0 Plan

Status: Implemented
Target version: 0.10.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_9_PLAN.md`](V0_9_PLAN.md)
Upstream dependencies: existing local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages plus the current `sql.js`
dependency. This release is expected to reuse the v0.9 browser runtime
contracts and should not require new PDL or Algraf runtime behavior.

## Purpose

Studio v0.10 defines what the IDE page is for.

The v0.9 IDE is a useful "hello, world" runtime surface: edit a CSV, edit PDL,
edit Algraf, see a prepared CSV and chart. It proves the browser runtimes work
together, but it does not yet explain the analyst workflow the page owns.

The v0.10 release goal is to turn that demo into a small but coherent IDE loop:

```text
source data -> preparation source -> named prepared artifact -> Algraf chart
```

The page should let a user understand and repeat that loop without needing a
full project model. A user should be able to bring in a CSV, see the input data,
choose how to prepare it, run the preparation step, inspect the generated
artifact, edit the Algraf view over that artifact, and diagnose which step
failed.

SQL fits into that loop as an alternate preparation mode. Some users will want a
familiar SQL workflow instead of PDL for table preparation, but Algraf should
still receive ordinary prepared data files. Studio owns the workflow bridge:
SQL.js executes SQL, Studio serializes the tabular result as CSV, and Algraf
renders from that CSV.

This is intentionally not a PDL-to-SQL translation release, not an Algraf SQL
data-source release, and not a full IDE project-system release.

## IDE Workflow Thesis

The v0.10 IDE page should do five concrete jobs:

- provide a starter project that is small enough to understand immediately;
- make source upload a general IDE action rather than a SQL-only action;
- make the active run path visible from source data through prepared artifact to
  chart;
- let PDL and SQL compete as preparation engines over the same user-visible
  artifact contract;
- keep diagnostics tied to the step that produced them.

The page is not a SQL scratchpad, a case-study reader, or a marketing demo. It
is the first repeatable workspace for building a Datafarm workflow.

## Must

- Add an IDE preparation-mode control.

  Status: Implemented. The IDE MUST expose a clear mode switch between PDL
  preparation and SQL preparation. Switching modes MUST preserve each mode's
  current source text and MUST make the active preparation source, run status,
  output preview, diagnostics, and Algraf input path unambiguous.

- Keep the current example as a starter project.

  Status: Implemented. The IDE SHOULD keep a compact default dataset and chart, but
  it MUST frame them as a starter project rather than as the whole product. The
  starter project MUST demonstrate the full run loop: input data, preparation
  source, generated artifact, Algraf source, chart output, and diagnostics.

- Simplify the starter preparation step.

  Status: Implemented. The starter project SHOULD remove the current
  `visible_days` parameter and run-context slider. The default "hello, world"
  workflow should be a direct source CSV to prepared CSV transformation so the
  IDE introduces files, preparation, artifacts, and chart rendering before it
  introduces reactive parameters or dashboard state.

- Remove demo-style hero metrics from the IDE.

  Status: Implemented. The IDE SHOULD remove the current hero metric strip for PDL
  readiness, Algraf readiness, prepared rows, and diagnostics. Runtime status
  already belongs in the topbar or compact runtime controls. Prepared row counts
  and diagnostics should live beside the prepared artifact and diagnostics
  panels, where they explain the active workflow instead of decorating the
  page header.

- Remove the IDE hero, workflow bar, and card margins.

  Status: Implemented. The IDE should start directly with sidebar controls and
  editors. It should use an edge-to-edge workspace treatment with square panels
  instead of a marketing hero, workflow/path bar, large outer margins, rounded
  cards, or page-section spacing.

- Add general source-data upload.

  Status: Implemented. The IDE MUST let users choose local CSV, JSON, and LJSON
  files as source data outside SQL-specific controls. The uploaded source MUST
  replace or create the active IDE source data file, update the visible data
  preview, and feed the active preparation mode. PDL mode MUST receive the
  uploaded source through its runtime file map. SQL mode MUST import or refresh
  its queryable table from the same IDE-owned source data when that source is
  CSV rather than requiring a second SQL-only upload.

- Add SQL-only SQLite database upload.

  Status: Implemented. The IDE MUST expose SQLite database upload only when SQL
  preparation mode is selected. Opening a `.sqlite`, `.sqlite3`, or `.db` file
  MUST replace the active SQL.js database for SQL mode without changing the
  active IDE source file.

- Keep one active source file in scope.

  Status: Implemented. v0.10 MAY limit the IDE to one active source file plus
  the generated prepared artifact. The UI SHOULD preserve a stable path for
  uploaded CSV source data so the default PDL and Algraf sources remain
  runnable. Multi-file source catalogs and file-tree behavior remain deferred.

- Make the run loop explicit.

  Status: Implemented. The IDE MUST show which preparation mode produced the
  current prepared artifact, which artifact path Algraf consumes, when that
  artifact was last successfully generated, and how many rows it contains. A
  failed run MUST leave the current active artifact state understandable.

- Make SQL preparation an IDE workflow, not a separate scratchpad.

  Status: Implemented. The SQL state needed for the IDE MUST be owned by the
  IDE workflow. The active query result, SQL diagnostics, imported table
  metadata, database state, and selected output artifact MUST be available to
  the IDE run path instead of living only inside an isolated child page.

- Seed SQL mode from IDE data.

  Status: Implemented. SQL mode MUST start with a queryable table derived from the
  IDE's active CSV source so that the default IDE example works without upload
  and uploaded IDE CSV data can be queried without a second import step. JSON
  and LJSON source files remain visible IDE source files but do not automatically
  become SQL tables in v0.10.

- Materialize SQL query results as prepared CSV artifacts.

  Status: Implemented. A successful SQL query that returns columns MUST be
  serializable into a named CSV artifact. The default artifact path is
  `prepared_series.csv` for both PDL and SQL mode so the same Algraf source can
  render either mode. SQL statements that do not return a tabular result MUST
  NOT replace the previous prepared artifact silently.

- Feed Algraf from the active prepared artifact.

  Status: Implemented. In SQL mode, the Algraf runtime file map MUST include the
  materialized SQL CSV artifact under the selected artifact path. In PDL mode,
  the Algraf runtime file map MUST continue to use files emitted by PDL. Algraf
  MUST continue to receive ordinary in-memory files and MUST NOT receive SQL
  source, database handles, or query execution responsibility.

- Keep artifact contracts boring.

  Status: Implemented. The first IDE artifact contract MUST be a path-like CSV file
  in the in-memory file map. Future releases may add typed tables or richer
  lineage, but v0.10 should prove the workflow with the same file-map mechanism
  PDL and Algraf already use.

- Keep PDL and SQL preparation separate.

  Status: Implemented. PDL mode MUST continue to run through the PDL runtime and
  editor service. SQL mode MUST run through SQL.js. Studio MUST NOT translate
  PDL to SQL, translate SQL to PDL, parse either language's semantics in
  TypeScript, or route SQL execution through PDL.

- Surface mode-aware diagnostics.

  Status: Implemented. The IDE diagnostics summary MUST include diagnostics for the
  active preparation mode plus Algraf diagnostics. Inactive-mode diagnostics
  SHOULD remain available only where useful, but they MUST NOT make the active
  run appear broken. SQL query errors MUST be actionable and MUST NOT crash the
  IDE.

- Update the spec for shipped behavior.

  Status: Implemented. When implementation begins, `docs/STUDIO_SPEC.md` MUST be
  updated to describe the v0.10 IDE preparation modes, SQL-to-CSV artifact
  contract, file-map behavior, diagnostics, UI surface, validation expectations,
  and runtime boundary rules.

## Should

- Keep v0.10 incremental.

  Status: Implemented. The release should preserve the ephemeral browser-local IDE
  model from v0.9 and avoid introducing persistence, a full project manifest, or
  a multi-step execution graph.

- Reuse SQL workspace infrastructure.

  Status: Implemented. Existing SQL helpers for query execution, CSV import,
  result normalization, and CSV serialization should be reused. UI changes
  should factor state only as much as needed for the IDE bridge.

- Make the active data path traceable.

  Status: Implemented. The IDE should show enough metadata to understand whether
  the current chart came from PDL or SQL, which source produced it, what CSV
  path Algraf consumed, and how many rows were materialized.

- Preserve the existing PDL-first workflow.

  Status: Implemented. The default PDL example should still work as it does in
  v0.9. SQL mode is an additional preparation path, not a removal of PDL from
  Studio.

- Keep the UI work-focused.

  Status: Implemented. The IDE should favor compact controls, stable panel sizes,
  and clear editor/output/preview relationships. It should avoid header
  metrics, a workflow/path bar, rounded card treatment, large margins, or demo
  labels that repeat information already available in the editor panels. This release should not
  broaden into a redesign of the landing, docs, case studies, or labs surfaces.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Run `npm run build` when validating final release packaging, static WASM asset
paths, deployment behavior, or GitHub Pages readiness.

Manual browser verification MUST confirm:

- The IDE exposes PDL and SQL preparation modes.
- The IDE header no longer shows the demo-style PDL/Algraf/prepared
  rows/diagnostics metric strip.
- The default PDL mode produces the prepared CSV and renders the Algraf chart
  without requiring a run-context parameter or slider.
- SQL mode starts with a queryable table from the IDE's active CSV source.
- Uploading a CSV through the IDE sidebar updates the visible source data and
  feeds both PDL mode and SQL mode.
- Uploading JSON or LJSON through the IDE sidebar updates the visible source
  file and feeds PDL through the runtime file map.
- Opening SQLite is available only in SQL mode and replaces the SQL database
  without changing the IDE source file.
- A valid SQL query produces a named CSV artifact and the Algraf chart renders
  from that artifact.
- Editing the SQL query updates the SQL result, materialized CSV preview, and
  chart after a successful run.
- A SQL query error is surfaced without crashing Studio and without silently
  replacing the last valid prepared artifact.
- Algraf diagnostics still appear when the chart source references a missing or
  incompatible prepared file.
- Switching between PDL and SQL modes preserves each mode's source text and
  makes the active source of the chart clear.
- The IDE starts directly with a sidebar and editor grid, without the workflow
  path bar, and uses square, edge-to-edge panels instead of hero/page-card
  spacing.
- Landing, Case Studies, Docs, How Built, and Labs Interactivity behavior
  remains unchanged.
- PDL, Algraf, and SQL.js runtime status remains visible where relevant.

## Deferred

- Persistent project storage.
- Canonical project manifest.
- Browser-local project save/load.
- Multi-step PDL and SQL execution graphs.
- Chaining SQL output into PDL or PDL output into SQL.
- PDL-to-SQL or SQL-to-PDL translation.
- Direct Algraf SQL data sources.
- SQL editor intelligence beyond Monaco's built-in SQL mode.
- Server-side SQLite or remote database connections.
- Remote projects or collaboration.
- Source control integration.
- Automated browser smoke tests.
