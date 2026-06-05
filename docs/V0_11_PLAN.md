# Datafarm Studio v0.11.0 Plan

Status: Implemented
Target version: 0.11.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_10_PLAN.md`](V0_10_PLAN.md)
Upstream dependencies: existing local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages. This release is expected to reuse
the v0.10 browser runtime contracts and should not require new PDL or Algraf
runtime behavior.

## Purpose

Studio v0.11 fixes the app-wide live-preview artifact contract so saved CSV
filenames are the connection point between PDL and Algraf.

The v0.10 IDE explains a useful workflow:

```text
source data -> preparation source -> named prepared artifact -> Algraf chart
```

The current implementation still treats parts of that workflow as a fixed demo.
The landing preview is pinned to `sorted_days.csv`, and the IDE PDL path is
pinned to `prepared_series.csv` for prepared-output detection and visible
metadata. When a user edits PDL to save a different CSV and edits Algraf to read
that same CSV, the PDL runtime can emit the file but Studio may not treat it as
the active artifact. The chart then appears stuck on the starter artifact path.

The release goal is to make renamed saved CSV files work across Studio's live
surfaces without adding a full project file tree or reimplementing PDL or Algraf
parsing in Studio. The audit scope includes Landing, IDE, Case Studies, Docs How
Built examples, and Labs Interactivity.

## Artifact Routing Thesis

PDL `save` outputs are ordinary files in the runtime file map. Algraf `data:`
references are ordinary file lookups in that same map. Studio's job is to pass
the saved file map through, choose a user-visible active artifact for previews,
and surface missing-file diagnostics when the two sources disagree.

The default starter filenames should remain stable for first load, SQL mode, and
documentation, but PDL mode must not require users to keep those filenames after
they start editing.

## Must

- Add this v0.11 plan before implementation.

  Status: Implemented. `docs/V0_11_PLAN.md` defines the release scope for the
  saved-CSV artifact routing fix.

- Update the Studio spec for editable PDL artifact filenames.

  Status: Implemented. `docs/STUDIO_SPEC.md` MUST describe that PDL-mode starter
  surfaces may default to fixed artifact paths, but successful PDL saved files
  are the authoritative file map entries supplied to Algraf. The spec MUST also
  state how Studio chooses the active prepared CSV preview when multiple saved
  CSV files exist.

- Audit and fix app-wide PDL-to-Algraf saved-file routing.

  Status: Implemented. Landing, IDE, Case Studies, Docs How Built, and Labs
  Interactivity MUST be checked for fixed-output gating that prevents Algraf
  from seeing renamed PDL saved CSV files. Surfaces with fixed product contracts
  MAY keep their default labels and examples, but they MUST pass all PDL saved
  files through the Algraf file map and MUST avoid silently substituting a
  stale default file when the user edits matching PDL and Algraf filenames.

- Fix IDE PDL-mode prepared artifact selection.

  Status: Implemented. In PDL mode, the IDE MUST stop treating
  `prepared_series.csv` as the only successful prepared artifact. If the PDL
  runtime emits saved CSV files, Studio MUST keep those files in the Algraf file
  map and select an active prepared CSV from the emitted files. The starter path
  `prepared_series.csv` remains the default and the SQL materialization path.

- Render IDE Algraf charts from renamed PDL saves.

  Status: Implemented. If a user changes the IDE PDL source to save
  `prepared_series_test.csv` and changes the Algraf source to
  `data: "prepared_series_test.csv"`, the chart MUST render from
  `prepared_series_test.csv` when the saved CSV schema matches the chart.

- Make IDE artifact metadata reflect the active saved file.

  Status: Implemented. The IDE sidebar artifact summary and prepared-output panel
  MUST show the selected active artifact path and row count instead of always
  showing `prepared_series.csv` in PDL mode.

- Preserve SQL mode's fixed artifact path.

  Status: Implemented. SQL mode MUST continue to materialize successful tabular
  query results as `prepared_series.csv` in v0.11. This fix MUST NOT introduce
  dynamic SQL output paths, SQL-to-PDL routing, or Algraf SQL data sources.

- Fix landing preview artifact detection.

  Status: Implemented. The landing live preview MUST render when the PDL source
  saves a renamed CSV and the Algraf source references that saved CSV. The
  visible output panel SHOULD show the selected saved CSV path instead of being
  pinned to `sorted_days.csv`.

- Fix Docs How Built preview artifact detection.

  Status: Implemented. The live How Built example MUST keep its default
  `visible_days.csv` behavior, but it SHOULD render from a renamed PDL saved
  CSV when the edited Algraf source references that file.

- Preserve fixed multi-output Labs behavior while passing saved files through.

  Status: Implemented. Labs Interactivity MAY keep `zone_summary.csv` and
  `active_rankings.csv` as its explicit two-chart contract. The runtime file map
  MUST still include all PDL saved files, and missing or renamed expected files
  MUST surface as diagnostics instead of falling back to stale defaults.

- Preserve case-study section contracts while passing saved files through.

  Status: Implemented. Case-study sections MAY keep section `dataFile` labels and
  `prepared.csv` aliases because story metadata is part of the published
  content contract. The Algraf file map MUST still include PDL saved files, and
  section reruns MUST not discard a renamed saved CSV that an edited chart
  references.

- Keep runtime delegation intact.

  Status: Implemented. Studio MUST NOT parse PDL or Algraf semantics to implement
  this fix. It may inspect PDL runtime saved-file results and may use Algraf
  diagnostics/errors after rendering attempts, but language behavior remains in
  the WASM runtimes and editor services.

## Should

- Prefer a small shared artifact-selection helper.

  Status: Implemented. Landing, IDE, Docs How Built, and any future single-preview
  surface should use the same Studio-side helper for selecting a saved CSV
  artifact from PDL runtime files so their behavior stays consistent.

- Keep starter examples unchanged on first load.

  Status: Implemented. The default landing and IDE sources should continue to load,
  prepare, preview, and render exactly as they did before this fix.

- Make mismatch failures explicit.

  Status: Implemented. If PDL saves one CSV path and Algraf references a different
  missing path, Studio should let Algraf diagnostics explain the missing file
  instead of silently substituting the starter artifact.

- Keep the release narrow.

  Status: Implemented. v0.11 should not add persistent projects, a file tree,
  multi-output selection UI beyond the active preview label, or a new project
  manifest.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Manual browser verification MUST confirm:

- The default landing preview still renders from `sorted_days.csv`.
- Renaming the landing PDL save path and matching Algraf `data:` path renders a
  chart from the renamed saved CSV.
- The default IDE PDL mode still renders from `prepared_series.csv`.
- In IDE PDL mode, changing the PDL save path to `prepared_series_test.csv` and
  Algraf `data:` to `prepared_series_test.csv` renders the chart.
- In IDE PDL mode, the artifact summary and prepared-output panel show the
  active renamed CSV path and row count.
- In IDE PDL mode, a mismatch between saved CSV path and Algraf `data:` path
  surfaces an Algraf diagnostic without silently falling back to
  `prepared_series.csv`.
- SQL mode still materializes and renders from `prepared_series.csv`.
- Uploading CSV source data still feeds PDL mode and SQL mode as in v0.10.
- Case Studies, Docs, How Built, and Labs Interactivity behavior remains
  unchanged.
- Edited Docs How Built sources render when PDL saves a renamed CSV and Algraf
  references that renamed CSV.
- Edited case-study section sources keep saved PDL files available to Algraf,
  including a renamed CSV referenced by the edited chart.
- Labs Interactivity keeps rendering its default two charts and continues to
  surface diagnostics when an expected reactive output path is missing.

Run `npm run build` when validating final release packaging, static WASM asset
paths, deployment behavior, or GitHub Pages readiness.

## Deferred

- Persistent project storage.
- Canonical project manifest.
- Browser-local project save/load.
- File-tree or multi-file project UI.
- Explicit multi-output artifact picker.
- Dynamic SQL output artifact names.
- Chaining SQL output into PDL or PDL output into SQL.
- PDL-to-SQL or SQL-to-PDL translation.
- Direct Algraf SQL data sources.
- Automated browser smoke tests.
