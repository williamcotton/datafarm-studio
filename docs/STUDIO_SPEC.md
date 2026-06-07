# Datafarm Studio Detailed Specification

Status: 0.18.0
Audience: implementers, product engineers, runtime integrators, UI engineers, editor-service authors, and test authors
Scope: browser-based Datafarm workspace, case-study publishing surface, PDL and Algraf WASM integration, Monaco editor host, in-memory project model, and planned data science IDE surface

## 0. Document Contract

This document specifies Datafarm Studio.

Studio is the browser application that brings PDL data preparation, Algraf
visualization, editable source files, data previews, diagnostics, and published
data stories into one workspace.

The current implementation is version 0.18.0. It is a Vite/React application
with a Datafarm landing page, route-aware top-level navigation, an initial
client-side IDE surface with PDL and SQL preparation modes, two bundled case
studies, a dedicated reactive interactivity lab, browser-local SQL.js
preparation inside the IDE, app-wide PDL saved-CSV artifact routing into
Algraf file maps, a Docs section that includes the explanatory How Built
walkthrough, and product copy that describes user-visible workflows rather than
release migrations.

The current case studies are product content and workflow demonstrations. They
MUST be treated as a marketing and publishing surface as the broader IDE grows.

The planned IDE surface is intentionally larger than the current implementation.
This specification separates shipped requirements from future design. Sections
that describe current behavior use `MUST`, `SHOULD`, `MAY`, and `MUST NOT`.
Sections that describe future work are marked deferred or planning guidance
until a versioned plan promotes them into shipped behavior.

The staged release plans live under `docs/` as `V0_*_PLAN.md` files. The
earliest unreleased plan is the active implementation target. Later unreleased
plans are sequencing guidance.

Items in a plan are planning guidance until they are promoted into normative
sections of this specification and implemented.

The keyword `MUST` means required behavior.

The keyword `SHOULD` means recommended behavior.

The keyword `MAY` means optional behavior.

The keyword `MUST NOT` means prohibited behavior.

The keyword `implementation-defined` means behavior may vary, but Studio must
document the chosen behavior.

The keyword `diagnostic` means a machine-readable error or warning with source
span or UI location information.

The keyword `workspace` means the user's open Datafarm project inside Studio.

The keyword `project` means a set of source files, data files, outputs,
settings, and metadata that can be opened, run, and published.

The keyword `file map` means an in-memory mapping from path-like names to file
contents supplied to a WASM runtime.

The keyword `story` means a curated sequence of analytical sections with raw
data, PDL source, Algraf source, prepared output, chart output, evidence, and
conclusion text.

The keyword `section` means one analytical unit inside a story.

The keyword `runtime` means the browser-loaded PDL or Algraf WebAssembly module
plus its TypeScript adapter.

The keyword `editor service` means the PDL or Algraf language feature ABI used
for diagnostics, completion, hover, formatting, symbols, references, rename, and
related Monaco behavior.

The keyword `published surface` means the visible story, guide, hero, and case
study UI shown to readers or prospects.

The keyword `IDE surface` means the project, file, execution, data, preview,
diagnostic, and collaboration UI used by analysts and builders.

## 1. Executive Summary

Datafarm Studio is the integrated workspace for Datafarm analytical projects.

Its core idea is:

```text
raw data -> PDL preparation -> prepared tables -> Algraf charts -> story or app output
```

PDL prepares deterministic tabular data.

Algraf renders deterministic data visualizations.

Studio owns the browser workspace around those runtimes.

Version 0.10.0 introduced a product structure around the PDL to Algraf
workflow:

- Landing, a first-view introduction to Datafarm Studio as the browser IDE for
  the PDL to Algraf workflow.
- IDE, an ephemeral browser workspace with one active source file, a PDL or SQL
  preparation mode, a named prepared CSV artifact, Algraf editing, chart
  preview, runtime status, diagnostics, and SQL-only SQLite database upload.
- Case Studies, the home for two curated workflows.
- Docs, a documentation section with overview, language, runtime,
  interactivity, SQL, and How Built content.
- Labs, the reactive Interactivity demo.

Version 0.11.0 keeps that structure and fixes the app-wide saved artifact
contract: when PDL emits saved CSV files, Studio passes those files to Algraf
and single-preview surfaces can select an active prepared artifact from those
saved files instead of requiring the starter filename.

Version 0.12.0 keeps the v0.11 browser workflow and switches Studio package
dependencies from local sibling installs to the published npm package surfaces:
`pdl-wasm@0.30.0`, `pdl-editor@0.30.0`, `algraf-wasm@0.67.0`, and
`algraf-editor@0.67.0`.

Version 0.13.0 keeps the v0.12 runtime and editor workflow and cleans up the
visible Studio copy across Landing, IDE, Case Studies, Docs, Docs How Built,
Labs Interactivity, and case-study metadata. The Case Studies index introduces
case studies as inspectable workflows rather than migration artifacts.

Version 0.14.0 updates the Algraf browser package surface to
`algraf-wasm@0.68.5` and `algraf-editor@0.68.5`, supplies the host-owned
Onigasm and Monaco worker assets required by the Algraf editor package, and
changes the default WASM sync path so `npm run dev` and `npm run build` serve
the WASM files shipped by the installed browser runtime packages.

Version 0.18.0 rewrites the landing-page hero around "Two languages. Two
runtimes." and folds the native Rust CLI and Arrow IPC story into the hero
blurb so the headline is grounded immediately. The landing CLI strip below
the section grid is rewritten so the Arrow IPC pipe between PDL and Algraf is
its headline claim rather than a generic "also runs on your terminal"
footnote. The hero `h1` font size is tuned down from the global 64px default
to a clamped scale that sits proportionate to the live preview shell beside
it. Routes, story bundles, runtime adapter contracts, story workflow helpers,
WASM ABIs, panel structures, and section-card destinations are unchanged.

The current Case Studies section contains:

- Solar, a state-level solar capacity and output story.
- Bikeshare, an urban bike-share revenue and operations story.

The Labs and Docs surfaces include:

- Interactivity, a compact PDL context and Algraf event demonstration with a
  reactive selector and dependent chart.
- SQL preparation, a browser-local SQL.js path inside the IDE that imports the
  active IDE CSV source or opens an uploaded SQLite database, runs SQL,
  serializes tabular query results as a named CSV artifact, and passes that
  artifact to Algraf through the in-memory file map.
- How Built, a one-slider PDL and Algraf walkthrough showing how the runtime,
  editor, event, and view boundaries are wired in React under Docs.

Each workflow exposes the same section structure:

- editable raw data;
- editable PDL source;
- prepared CSV output;
- editable Algraf source;
- rendered SVG chart;
- evidence and conclusion copy.

Studio currently proves these production contracts:

- PDL and Algraf WASM artifacts can run together in the browser.
- Monaco can host PDL, Algraf, CSV, and JSON editors.
- Editor services can be driven from the same WASM runtimes used for execution.
- A single PDL story program can emit named outputs for multiple chart sections.
- Per-section edits can override the story program path.
- A host-owned PDL context map can drive browser re-evaluation.
- Algraf charts can render from host-supplied in-memory files.
- PDL saved CSV files are passed through to Algraf on live editable surfaces,
  including renamed saved files when the edited Algraf source references the
  same path.
- Algraf sidecar and inert SVG event metadata can be routed through React state.
- SQL.js can load from a Studio-served WASM asset, own an in-memory SQLite
  database, import the active IDE CSV source, open user-selected SQLite
  database files, run SQL, and expose tabular query results without a server.
- Studio can serialize a SQL query result as an in-memory CSV file for Algraf
  without routing SQL through PDL or teaching Algraf SQL semantics.
- The Docs How Built page can explain React state ownership, PDL and Algraf API
  boundaries, event bridging, data flow, and component organization in the
  visible UI without depending on the full Interactivity demo.
- GitHub Pages can serve the app with a configurable Vite base path.
- Browser-history routes can address Landing, IDE, Case Studies, Docs, How
  Built, and Labs surfaces, with `dist/404.html` mirroring the app shell for
  GitHub Pages fallback routing.

Future versions will expand the initial IDE into a project-oriented data
science IDE. The IDE should make files, runs, data lineage, diagnostics,
previews, outputs, and publish targets first-class without reimplementing PDL or
Algraf in TypeScript.

## 2. Product Goals

Studio MUST make the PDL -> Algraf workflow visible and auditable.

Studio MUST use the PDL and Algraf runtimes as the source of language truth.

Studio MUST keep source, data, diagnostics, prepared outputs, and rendered
outputs aligned for every run.

Studio MUST preserve deterministic output paths and section identifiers.

Studio MUST support local development with Vite.

Studio MUST support static deployment to GitHub Pages.

Studio SHOULD evolve toward a project-oriented data science IDE.

Studio SHOULD separate product content from core IDE infrastructure.

Studio SHOULD make intermediate tables inspectable before charts consume them.

Studio SHOULD make runtime errors and language diagnostics actionable.

Studio SHOULD support repeatable release planning through spec and plan files.

Studio SHOULD make cross-repo PDL and Algraf version assumptions explicit.

Studio MAY support local projects, remote projects, notebooks, dashboards,
published story pages, and reusable components in later versions.

Studio MAY support additional execution backends in later versions, provided PDL
and Algraf remain authoritative for their languages.

## 3. Non-Goals

Studio is not a PDL implementation.

Studio is not an Algraf implementation.

Studio MUST NOT parse, analyze, execute, or render PDL or Algraf semantics in
TypeScript except for lightweight UI adaptation.

Studio is not initially a multi-user collaborative editor.

Studio is not initially a server-backed data platform.

Studio is not initially a notebook kernel host for arbitrary code.

Studio is not initially a general spreadsheet.

Studio is not initially a replacement for source control.

Studio MUST NOT allow untrusted chart output to execute arbitrary script in the
application context. Interactive output must be explicitly audited before it is
embedded.

## 4. Current Implementation Summary

The current application is a single Vite app.

Application code lives in `src/`.

The React entry point is `src/main.tsx`.

The top-level state and runtime orchestration container is `src/App.tsx`.

Client-side route parsing and base-path URL construction live in
`src/router.ts`.

Reusable shell and workflow UI is split into focused components under
`src/components/`.

Story workflow execution helpers live in `src/storyWorkflow.ts`.

Shared Studio types live in `src/studioTypes.ts`.

Formatting, diagnostic, and snapshot helpers live in `src/studioUtils.ts`.

SQL workspace helpers for CSV import, table/schema inspection, query result
normalization, and result CSV serialization live in `src/sqlWorkspace.ts`.

Reactive demo constants live in `src/interactivityDemoData.ts`.

Story metadata and bundled source imports live in `src/storyBundles.ts`.

PDL editor and runtime integration are consumed from the published
`pdl-editor@0.30.0` and `pdl-wasm@0.30.0` packages.

Algraf editor and runtime integration are consumed from the published
`algraf-editor@0.68.5` and `algraf-wasm@0.68.5` packages.

Raw data editing lives in `src/DataEditor.tsx`.

SQL query editing lives in `src/SqlEditor.tsx`.

The reusable SQL workspace page lives in `src/components/SqlWorkspacePage.tsx`
for compatibility and development, while the product IDE owns its SQL
preparation workflow directly.

The Landing, IDE, Case Studies, Docs, and route link components live under
`src/components/`.

Bundled stories live under `src/datafarm-solar/` and
`src/datafarm-bikeshare/`.

Production WASM files are served from `public/wasm/`. The default asset sync
copies package-local runtime WASM from `node_modules` into that public
directory; coordinated cross-repo checks MAY overwrite those files with locally
built sibling WASM via `npm run copy:wasm`.

GitHub Pages deployment is defined in
`.github/workflows/studio-pages.yml`.

## 5. Workspace Model

Version 0.10.0 exposes an initial client-side IDE surface but does not expose a
general persisted project workspace model.

Internally, Studio maintains editable per-story state:

- raw data by story;
- PDL source by story and section;
- Algraf source by story and section;
- runtime state for PDL and Algraf;
- per-section execution snapshots.
- IDE active source file, uploaded source file name, source language, active
  preparation mode, IDE PDL source, IDE SQL source, IDE Algraf source,
  generated IDE prepared CSV artifact, chart result, and diagnostics.
- reactive demo context, source, generated files, chart results, and last Algraf
  event payload.
- SQL.js runtime state, active IDE in-memory SQLite database, SQL database
  source, SQL query text, query result, imported source metadata, materialized
  SQL CSV artifact, and SQL diagnostic state.

The in-memory workspace MUST be the only source supplied to the browser WASM
runtimes. The runtimes do not read host files directly.

The in-memory workspace MUST preserve path-like names that match the source
programs. For current stories, raw files are keyed by their visible labels such
as `solar_state.csv`, `trips_raw.csv`, and `us_counties.geojson`.

Future project work SHOULD formalize this state into a reusable project model
with files, outputs, settings, run history, editor models, and publication
metadata.

### 5.1 IDE SQL Preparation Model

Version 0.10.0 makes SQL an IDE preparation mode over the active IDE source
when it is CSV, or over an uploaded SQLite database. The reusable SQL workspace
component MAY still render as a standalone page for development or
compatibility, but the product IDE workflow owns SQL preparation directly.

The IDE SQL preparation mode MUST create and own a browser-local SQL.js
database in memory. The database MUST NOT require a server, remote API, or
filesystem persistence.

The IDE SQL preparation mode MUST initialize SQL.js with a `locateFile`
function that resolves `sql-wasm.wasm` through Studio's public asset base path.

The IDE MUST let users choose local CSV, JSON, and LJSON files as the active
source data file outside SQL-specific controls. Version 0.10.0 MAY keep one
active source file for the starter workflow.

The IDE SQL preparation mode MUST import or refresh a SQL table from the active
IDE source when that source is CSV. The default starter source path is
`manual_series.csv`, and the default SQL table name is `manual_series`.

The IDE SQL preparation mode MUST let users choose `.sqlite`, `.sqlite3`, or
`.db` files when SQL mode is active and open the uploaded bytes as the active
SQL.js database. This control MUST NOT be shown as a PDL-mode source-data
control.

CSV import MUST parse quoted commas, escaped quotes, CRLF, LF, and UTF-8 BOM.
The first CSV row MUST become column names. Empty, duplicate, or SQL-unsafe
column names MUST be normalized into stable SQLite identifiers.

Imported CSV values MAY be stored as SQLite `TEXT` columns in the first release.

JSON and LJSON source files MUST be visible as IDE source files and supplied to
PDL through the runtime file map. Version 0.10.0 does not automatically import
JSON or LJSON source files into SQL tables.

The IDE SQL preparation mode MUST execute user-entered SQL against the active
IDE SQL.js database and surface SQL errors without crashing Studio.

A successful SQL query that returns columns MUST be serializable into the IDE
prepared CSV artifact. The v0.10 starter artifact path is
`prepared_series.csv`.

SQL statements that do not return a tabular result MUST NOT silently replace the
last successful prepared CSV artifact.

The IDE SQL preparation mode SHOULD surface that SQL.js databases are
memory-backed in this release and that large uploads are constrained by browser
memory.

The IDE SQL preparation mode MUST NOT add SQL semantics to PDL, pass SQL source
to Algraf, or add TypeScript implementations of PDL or Algraf behavior.

## 6. Story Model

A story is a curated analytical sequence.

In version 0.9.0, stories are declared as `StoryBundle` values in
`src/storyBundles.ts`.

Each story MUST have:

- stable `id`;
- URL or bundle `slug`;
- navigation label;
- brand subtitle;
- story markdown source;
- story-level PDL program source;
- story-level PDL program path;
- hero copy and metrics;
- raw data file declarations;
- method cards;
- ordered section list;
- guide copy.

Each section MUST have:

- stable `id`;
- display `number`;
- title;
- question;
- summary;
- PDL source label;
- Algraf source label;
- prepared CSV filename;
- PDL named output name;
- PDL program path;
- PDL source;
- Algraf source;
- evidence list;
- conclusion.

Sections MAY declare supporting files and supporting outputs.

Story IDs and section IDs SHOULD be stable. They are used as React keys, state
keys, editor model paths, and output routing identifiers.

## 7. Current Case Studies

Version 0.9.0 ships two stories under the Case Studies route group.

### 7.1 Solar

Solar is identified by `solar` and uses the slug `datafarm-solar`.

Solar raw files are:

- `solar_state.csv`;
- `solar_seasonal.csv`;
- `us_counties.geojson`.

Solar sections are:

- `capacity-by-state`;
- `sun-capacity-factor`;
- `capacity-vs-output-rank`;
- `seasonal-mix`;
- `output-per-mw`.

Solar uses a story-level PDL program at
`memory/datafarm-solar/story.pdl`.

### 7.2 Bikeshare

Bikeshare is identified by `bikeshare` and uses the slug
`datafarm-bikeshare`.

Bikeshare raw files are:

- `trips_raw.csv`;
- `stations.csv`;
- `weather_daily.csv`.

Bikeshare sections are:

- `daily-rider-trips`;
- `duration-distance`;
- `revenue-inversion`;
- `weather-split`;
- `dock-priority`.

Bikeshare uses a story-level PDL program at
`memory/datafarm-bikeshare/story.pdl`.

### 7.3 Interactivity Demo

The Interactivity view is a separate Labs page, not a story section.

The demo MUST show:

- host-owned controls for PDL context values;
- generated `zone_summary.csv` and `active_rankings.csv` files;
- a selector Algraf chart with `On(event: "click", emit: zone)`;
- a dependent Algraf chart that re-renders from the selected PDL output;
- editable raw CSV, PDL, and Algraf sources.

The demo dashboard context MUST include:

- `time_cutoff`, a numeric PDL parameter controlled by a range input;
- `active_fleet`, a string PDL parameter controlled by a segmented control;
- `metric_column`, a string PDL parameter controlled by a select box and used by
  PDL dynamic column indirection;
- `priority_only`, a boolean PDL parameter controlled by a checkbox;
- `selected_zone`, a string PDL state value controlled by both a select box and
  Algraf chart events.

The first implementation MAY re-run the full demo workflow on every context or
source change.

### 7.4 IDE SQL Preparation

SQL preparation is an IDE mode, not a story section.

The IDE SQL preparation mode MUST show:

- SQL.js load status;
- the active source table derived from the IDE source CSV when available;
- uploaded SQLite database status when a SQLite database is open;
- Monaco-backed SQL query editor;
- a run command;
- prepared artifact status;
- SQL diagnostics;
- the generated prepared CSV artifact in the shared IDE output panel.

## 8. File Map Semantics

Studio MUST supply files to runtimes as in-memory maps.

The PDL runtime file map for a section MUST include the active story raw files.

The IDE PDL preparation mode MUST supply the active IDE source file in the PDL
runtime file map. Uploaded CSV source data MAY use the stable starter path
`manual_series.csv`.

The IDE SQL preparation mode MUST materialize a successful tabular query result
as a CSV string at `prepared_series.csv` in the IDE runtime file map.

Every live PDL-to-Algraf surface MUST include saved files emitted by the current
PDL run in the Algraf runtime file map. Studio MUST NOT require edited PDL
sources to save to starter filenames when an edited Algraf source references a
different saved CSV filename emitted by the same run.

Single-preview surfaces with one prepared-output panel, such as Landing, IDE
PDL mode, and Docs How Built, MUST select an active prepared artifact from PDL
saved CSV files. They MUST prefer the surface's starter path when that file was
emitted; otherwise they MUST choose the first emitted `.csv` path in stable
lexical order. The selected artifact path and row count SHOULD be visible
beside the prepared-output preview.

When PDL emits a saved CSV but Algraf references a different missing path,
Studio MUST let Algraf render diagnostics explain the mismatch. Studio MUST NOT
silently substitute a starter artifact path for the path requested by Algraf.

The Algraf runtime file map for a section MUST include:

- the active story raw files;
- section supporting files;
- saved files emitted by PDL when available;
- supporting outputs for the section when declared;
- the prepared section output as `prepared.csv`;
- the prepared section output under the section's `dataFile` name.

When the story-level run emits a saved file matching a section data file, Studio
MUST prefer that saved file. When the saved file is absent but a named PDL output
is present, Studio MAY serialize the named output table to CSV.

CSV serialization MUST quote cells containing comma, quote, CR, or LF. Quotes
inside cells MUST be doubled.

The IDE Algraf runtime file map MUST include the active IDE source file and the
active prepared CSV artifact. In PDL mode, the prepared artifact MUST come from
PDL saved files. In SQL mode, the prepared artifact MUST come from Studio's
SQL-result CSV serialization.

In SQL mode, `prepared_series.csv` remains the v0.11 materialization path.
Dynamic SQL output artifact names, SQL-to-PDL chaining, PDL-to-SQL translation,
and direct Algraf SQL data sources are out of scope for version 0.11.0.

Labs Interactivity MAY keep its explicit `zone_summary.csv` and
`active_rankings.csv` two-chart contract. It MUST still include all PDL saved
files in the Algraf file map, and missing expected reactive output paths MUST
surface as diagnostics rather than falling back to stale default files.

Future project work SHOULD replace ad hoc story file maps with a project file
graph that records which runtime produced each generated file.

## 9. PDL Runtime Integration

Studio loads PDL from `public/wasm/pdl.wasm` using the Vite public base path.
Version 0.14.0 continues to consume `pdl-wasm@0.30.0` and
`pdl-editor@0.30.0` from published npm packages.

Version 0.14.0 requires a PDL v0.30-compatible browser package surface and a
v0.30-compatible PDL source/WASM runtime. Bundled case-study story sources MUST
remain compatible with the current story workflow. Because `state` is a PDL
declaration keyword in this runtime surface, bundled PDL sources that reference
a CSV column named `state` MUST use a backtick-escaped column reference such as
`` `state` ``. The interactivity demo MAY use v0.30 reactive `param` and
`state` declarations and dynamic column indirection through `col(...)`.

The PDL WASM module MUST expose:

- `memory`;
- `pdl_alloc`;
- `pdl_dealloc`;
- `pdl_run_json`;
- `pdl_editor_service_json`.

Studio MUST fail runtime loading if any required export is absent.

PDL runtime calls MUST use JSON payloads encoded into WASM memory.

`pdl_run_json` payloads MUST include:

- `source`;
- `files`;
- `program_path`.

`pdl_run_json` payloads MAY include `stdout_format`.

`pdl_run_json` payloads MAY include `context`, a JSON object keyed by declared
PDL context name. Context values supplied by Studio MUST be null, boolean,
number, or string. Studio MUST NOT validate PDL context declarations or coerce
context values beyond preserving these JSON primitives; PDL owns those
semantics and diagnostics.

PDL run results MUST be interpreted as:

- `stdout`;
- `files`;
- `outputs`;
- `diagnostics`;
- `error`.

If `outputs` is absent, Studio MUST treat it as an empty list.

The PDL adapter MUST deallocate input and output buffers.

Studio MUST NOT implement PDL pipeline semantics in TypeScript.

The Interactivity page MUST pass the current dashboard context map to PDL on
each run and MUST surface PDL runtime diagnostics returned from that run.

## 10. Algraf Runtime Integration

Studio loads Algraf from `public/wasm/algraf.wasm` using the Vite public base
path.

Version 0.14.0 consumes `algraf-wasm@0.68.5` and `algraf-editor@0.68.5` from
published npm packages. The served Algraf WASM SHOULD come from the installed
`algraf-wasm` package during ordinary Studio development and production builds.

The Algraf WASM module MUST expose:

- `memory`;
- `algraf_alloc`;
- `algraf_dealloc`;
- `algraf_render_json`;
- `algraf_editor_service_json`.

Studio MUST fail runtime loading if any required export is absent.

Algraf render calls MUST use JSON payloads encoded into WASM memory.

`algraf_render_json` payloads MUST include:

- `source`;
- `files`.

Algraf render results MUST be interpreted as:

- `svg`;
- `sidecar`;
- `diagnostics`;
- `error`.

When `sidecar` is present, Studio MAY parse it as inert host metadata for
tooltip, highlight, and event routing behavior. Studio MUST NOT infer Algraf
event bindings from Algraf source text.

The Algraf adapter MUST provide host shims required by the current wasm-bindgen
and projection dependencies.

The Algraf adapter MUST deallocate input and output buffers.

Studio MUST NOT implement Algraf chart semantics or rendering in TypeScript.

The Interactivity page MUST route Algraf click emissions whose field is `zone`
to the Studio-owned PDL state binding `selected_zone`.

### 10.1 SQL.js Runtime Integration

Studio loads SQL.js from the `sql.js` package and loads SQL.js WASM from
`public/wasm/sql-wasm.wasm` using the Vite public base path.

Version 0.10.0 targets `sql.js` `^1.13.0`. The current lockfile may resolve any
compatible SQL.js version in that range.

Studio MUST initialize SQL.js with `initSqlJs({ locateFile })`. The `locateFile`
function MUST return `publicAssetUrl("wasm/sql-wasm.wasm")` for SQL.js WASM
requests. This mapping MUST remain stable even when the bundler resolves SQL.js
to a browser build that asks for `sql-wasm-browser.wasm`.

SQL.js databases MUST remain browser-local and memory-backed in version 0.10.0.

Studio MAY construct an empty database with `new SQL.Database()` and MAY
construct an uploaded database with `new SQL.Database(new Uint8Array(buffer))`.

Studio MAY export the active database by calling `db.export()` and downloading
the returned bytes as a SQLite file.

Studio MUST close replaced or unmounted SQL.js database instances.

Studio MUST NOT route SQL execution through PDL or Algraf. Studio MAY serialize
SQL query results as CSV and place them in the in-memory file map supplied to
Algraf.

## 11. Editor Integration

Studio uses Monaco for PDL, Algraf, CSV, JSON, and SQL editing.

PDL and Algraf editors MUST register language IDs, language configuration,
themes, TextMate grammars, markers, and editor-service-backed providers.

CSV and JSON data editors MUST use the shared Datafarm Monaco editor theme from
`src/editorTheme.ts`, matching the PDL and Algraf editor surfaces. Data editors
MUST NOT define a duplicate local Monaco theme.

The SQL editor MUST use Monaco's built-in `sql` language mode and the shared
Datafarm Monaco editor theme from `src/editorTheme.ts`. The SQL editor MUST
support controlled query text, stable model URIs, change callbacks, disposal
cleanup, and the same basic sizing and typography behavior as existing data
editor surfaces.

The PDL editor SHOULD expose:

- diagnostics;
- hover;
- completion;
- document formatting;
- semantic tokens;
- definition;
- references;
- rename;
- document symbols.

The Algraf editor SHOULD expose:

- diagnostics;
- hover;
- completion;
- signature help;
- document formatting;
- range formatting;
- semantic tokens;
- code actions;
- definition;
- references;
- document highlights;
- prepare rename;
- rename;
- document symbols.

Editor providers MUST call the language runtime editor-service ABI rather than
duplicating language logic.

Editor model URIs SHOULD be stable and path-like. They are used to derive PDL
program paths and Algraf URIs.

Editor-service failures SHOULD be logged and should not crash the whole app.

## 12. Execution Semantics

Studio MUST load both PDL and Algraf runtimes before automatic workflow
execution.

Studio MUST auto-run the active case study after both runtimes are ready.

Studio MUST allow users to run all sections with a visible command.

When no per-section PDL source has changed from its default, Studio MUST run the
story-level PDL program once and route its named outputs to sections.

When any per-section PDL source has changed from its default, Studio MUST run
each section PDL program independently.

Algraf rendering for a section MUST occur only when a prepared CSV is available.

Each section snapshot MUST capture:

- displayed PDL run result;
- CSV-producing PDL run result;
- PDL editor diagnostics;
- Algraf render result;
- Algraf diagnostics;
- combined error string.

Switching case studies MUST clear runtime errors, snapshots, and running state
while preserving source edits stored for each story.

The Interactivity page MUST evaluate the demo PDL source with the current
dashboard context map whenever a context value, demo source, or demo data file
changes.

The Interactivity page MUST pass generated PDL saved files to both Algraf chart
renders after each successful PDL run.

The Interactivity page MUST capture Algraf event payloads in the form
`{ type, field, value }` and route a click payload with `field: "zone"` to the
PDL `selected_zone` state value.

The Interactivity page MAY use full workflow re-execution rather than
fine-grained invalidation.

The IDE MUST let users choose between PDL and SQL preparation modes. Switching
modes MUST preserve each mode's source text and MUST make the active source of
the prepared artifact clear.

The IDE PDL preparation mode MUST run the IDE PDL source through the PDL
runtime with the active source file in the file map. The v0.10 starter PDL
source MUST NOT require a run-context slider or `visible_days` parameter.

The IDE SQL preparation mode MUST execute SQL only against the active
browser-local SQL.js database seeded from the active IDE CSV source or opened
from an uploaded SQLite database.

When an IDE SQL query returns columns, Studio MUST serialize the result as CSV
and materialize it at `prepared_series.csv` in the active IDE file map. SQL
query results are not filesystem saves unless a future product design adds
export controls.

When an IDE SQL query fails or does not return columns, Studio MUST surface a
diagnostic and MUST NOT silently replace the last successful SQL prepared
artifact.

The IDE MUST render the Algraf chart from the active prepared artifact. Algraf
MUST receive only source text and the in-memory file map; it MUST NOT receive a
SQL database handle or SQL source as data.

## 13. Diagnostics And Errors

Studio MUST surface runtime load errors.

Studio MUST surface PDL editor diagnostics in PDL Monaco markers.

Studio MUST surface Algraf diagnostics in Algraf Monaco markers.

Studio MUST surface SQL.js load, CSV import, and query errors in the IDE SQL
preparation UI.

Studio SHOULD surface PDL runtime diagnostics in the section status or output
area.

Studio SHOULD convert fatal Algraf errors into an editor-visible runtime
diagnostic at the start of the source.

The top-level UI MAY show a total diagnostic count across active sections.

Diagnostics from PDL and Algraf MUST retain their runtime-provided code,
severity, message, and source range where available.

Studio-defined diagnostics SHOULD use clear synthetic codes such as `Runtime`.

## 14. Rendering And Output Embedding

Algraf returns SVG strings.

Studio currently embeds returned SVG into the DOM for chart display.

Studio MUST only embed SVG returned by the trusted Algraf runtime loaded by the
application.

Studio SHOULD preserve the SVG's intrinsic viewBox and layout behavior.

Studio SHOULD display a clear empty or error state when no chart is available.

Interactive chart support MUST remain limited to audited inert metadata returned
by Algraf. Studio MAY read `data-algraf-event`, `data-algraf-emit-field`, and
`data-algraf-emit-value` attributes on trusted Algraf SVG marks, and MAY fall
back to nearest-mark sidecar hit testing. The current sidecar nearest-mark snap
radius is implementation-defined as 44 SVG pixels.

Studio MUST NOT allow script, `foreignObject`, event handler attributes, or
dynamic runtime code in embedded chart output.

## 15. UI Surface

The current UI has these major regions:

- topbar with brand, route-aware navigation, and runtime status;
- browser-history routes for Landing, IDE, Case Studies, Docs, Docs How Built,
  and Labs Interactivity;
- Landing page introducing Datafarm Studio as the browser IDE for PDL to
  Algraf;
- IDE page with sidebar preparation controls, CSV/JSON/LJSON source upload, PDL
  or SQL preparation editor, Algraf editor, generated CSV artifact preview,
  rendered chart preview, runtime status, and diagnostics;
- Case Studies index and per-story case-study pages;
- Docs index and Docs-owned How Built walkthrough;
- Labs-owned Interactivity page.

Each case-study page has:

- hero with story copy, metrics, and run command;
- method cards;
- raw data section;
- ordered story sections;
- guide section.

Each story section has:

- section header;
- status line;
- summary;
- PDL editor panel;
- Algraf editor panel;
- prepared output panel;
- rendered chart panel;
- conclusion and evidence list.

The Interactivity Labs page has:

- compact hero and runtime metrics;
- PDL context controls;
- event/diagnostic status;
- selector and dependent chart panels;
- generated CSV output panels;
- editable raw CSV, PDL source, and Algraf source panels.

The IDE SQL preparation mode has:

- SQL.js browser-memory status;
- a SQL table derived from the active IDE source CSV when available;
- SQL-only SQLite database upload;
- Monaco-backed SQL editor;
- run command;
- query result materialization into `prepared_series.csv`;
- SQL diagnostics and import metadata.

The Docs How Built page has:

- a compact hero explaining the one-slider example;
- a live surface with one React slider state, input CSV, editable PDL source,
  editable Algraf source, generated CSV output, and rendered Algraf chart;
- an Algraf bar chart whose numeric `day` column is positioned with
  `Scale(axis: x, type: "categorical")` and whose `fill` channel is driven by
  `value`;
- a direct chart click handler that reads Algraf event metadata and writes back
  to the same slider state;
- Monaco-highlighted TypeScript snippets in a linear single-`App.tsx` style
  wiring map;
- explanatory copy covering package imports, WASM setup, React state, editor
  components, view components, PDL and Algraf API boundaries, events, data flow,
  and rerun behavior.

The published Case Studies surface SHOULD remain readable for non-technical
story readers.

Published, landing, docs, and lab copy SHOULD describe what users can inspect,
edit, run, or learn. User-facing page copy SHOULD avoid migration wording,
release-note phrasing, and implementation inventories unless a page is directly
teaching a runtime or editor boundary.

The IDE surface SHOULD prioritize efficient repeated use by analysts over
marketing layout. The IDE page SHOULD avoid a hero section, large outer
margins, and card-like rounded panel styling.

## 16. Data Science IDE Direction

Version 0.13.0 introduced the current IDE surface as a browser-local, ephemeral
workspace. It MUST include:

- local/manual CSV editing;
- general CSV, JSON, and LJSON source upload;
- PDL preparation mode;
- SQL preparation mode backed by SQL.js;
- Algraf source editing;
- generated prepared CSV artifact preview that follows the active PDL saved CSV
  path in PDL mode and `prepared_series.csv` in SQL mode;
- rendered chart preview;
- runtime status;
- diagnostics.

Future IDE work should center on projects instead of fixed example files.

Planned IDE concepts include:

- project explorer;
- file tree;
- source editor tabs;
- data catalog;
- table preview;
- schema inspector;
- execution graph;
- run history;
- diagnostics panel;
- chart preview;
- output artifacts;
- publishing workflow;
- project settings.

These broader project concepts remain deferred in version 0.10.0.

When promoted, they SHOULD be implemented as reusable product primitives that
can also power the current story pages.

The IDE MUST continue to treat PDL and Algraf runtimes as authoritative.

The IDE SHOULD make every generated table and chart traceable to source files,
runtime versions, input files, and run options.

## 17. Project Files

Future projects SHOULD represent files with:

- stable path;
- language or media type;
- current content;
- dirty state;
- origin;
- generated/manual flag;
- runtime ownership where applicable.

Generated files SHOULD be separated from source files in the project model even
when they are displayed together.

The current story bundles encode source and generated CSV files directly in
TypeScript imports. That is acceptable for version 0.10.0 but SHOULD NOT be the
long-term project storage model.

## 18. Execution Graph

Future IDE work SHOULD model execution as a graph.

Graph nodes MAY include:

- raw data files;
- PDL programs;
- named PDL outputs;
- saved PDL files;
- Algraf chart sources;
- rendered SVG outputs;
- story sections;
- published pages.

Edges SHOULD capture file reads, file writes, named output routing, and render
dependencies.

The graph SHOULD support partial re-runs when only a subset of files changes.

Version 0.10.0 approximates this graph with story-level and per-section
workflow functions in `src/storyWorkflow.ts`, plus focused IDE and Interactivity
page workflow functions. `src/App.tsx` coordinates which routed surface is
active and stores the resulting case-study snapshots.

## 19. Data Preview

The current data preview is a text editor over CSV or JSON.

Future IDE work SHOULD provide table previews with:

- header detection;
- row count;
- column count;
- inferred types;
- sorting;
- filtering;
- sampling;
- null/missing summaries;
- value distribution summaries;
- copy and download actions.

Data preview behavior SHOULD be based on runtime outputs or shared data-service
logic rather than fragile string parsing in UI components.

## 20. Publishing Surface

The current case-study pages are the first publishing surface.

Future publishing MAY support:

- read-only story pages;
- interactive embedded charts;
- static exported artifacts;
- hosted project demos;
- shareable links;
- README or docs generation.

Publishing MUST record the runtime and source assumptions needed to reproduce
outputs.

Marketing copy and story assets SHOULD remain separate from core execution and
editor infrastructure.

## 21. Versioning

Studio version stamps MUST stay aligned when a release plan is implemented.

Current version stamps include:

- `package.json`;
- `package-lock.json`;
- `docs/STUDIO_SPEC.md`;
- any user-facing release strings added later.

When a future package, extension, manifest, or generated doc carries a Studio
version, it MUST be included in the version alignment checklist.

PDL and Algraf runtime versions are external dependencies. Studio plans and pull
requests SHOULD document whether they use package-local WASM assets or locally
built sibling artifacts.

For version 0.14.0 package validation, Studio uses published npm installs of
`pdl-wasm@0.30.0`, `pdl-editor@0.30.0`, `algraf-wasm@0.68.5`, and
`algraf-editor@0.68.5`. Runtime loading still uses `public/wasm/pdl.wasm`,
`public/wasm/algraf.wasm`, and `public/wasm/sql-wasm.wasm`, populated by
`npm run copy:package-wasm` for package-pinned runtime validation or by
`npm run copy:wasm` for coordinated local sibling runtime validation.

## 22. Build And Deployment

`npm run dev` MUST start Vite for local browser testing.

`npm run check` MUST run TypeScript with `tsc --noEmit`.

`npm run build:wasm` MUST place production PDL, Algraf, and SQL.js WASM assets
in `public/wasm/` from the installed runtime packages and SQL.js package.

`npm run copy:package-wasm` MUST copy packaged WASM artifacts from
`node_modules/pdl-wasm/dist/pdl.wasm`, `node_modules/algraf-wasm/dist/algraf.wasm`,
and `node_modules/sql.js/dist/sql-wasm.wasm` into `public/wasm/`.

`npm run copy:wasm` MUST copy locally built sibling WASM artifacts from
`../pdl` and `../algraf` into `public/wasm/` and copy SQL.js WASM from
`node_modules/sql.js/dist/sql-wasm.wasm`.

`npm run build` MUST prepare WASM assets, type-check, and build `dist/`.

`npm run preview` MUST serve the production build locally.

GitHub Pages deployment MUST compute a Vite base path appropriate for the
repository name and owner.

The built `dist/` output MUST contain non-empty `wasm/algraf.wasm`,
`wasm/pdl.wasm`, and `wasm/sql-wasm.wasm` assets.

## 23. Security

Studio currently runs entirely in the browser.

The browser runtimes MUST receive only host-supplied in-memory files.

Studio MUST NOT grant WASM runtimes arbitrary filesystem access.

Studio MUST NOT fetch arbitrary project files from remote URLs without an
explicit product design, permission model, and validation path.

User-selected CSV, JSON, and LJSON files in the IDE and user-selected CSV or
SQLite files in compatibility SQL workspace surfaces MUST remain local to the
browser runtime unless a future product design explicitly adds persistence or
remote upload.

Studio MUST treat embedded render output as trusted only when it comes from the
audited Algraf runtime.

Future user-imported projects MUST be treated as untrusted content.

Future persistence or collaboration services MUST define authentication,
authorization, and storage boundaries before implementation.

## 24. Performance

Version 0.14.0 runs a landing page, an initial IDE workspace, small bundled case
studies, a small reactive demo, and an in-memory SQL.js workflow; it does not
define strict performance budgets.

Future IDE releases SHOULD define budgets for:

- WASM load time;
- editor startup;
- run latency;
- chart render latency;
- large CSV preview;
- memory usage;
- project switching;
- incremental re-run latency.

Studio SHOULD avoid unnecessary duplicate runtime calls once a project execution
graph exists.

## 25. Accessibility

Interactive controls SHOULD use semantic buttons, links, and labels.

Runtime status SHOULD be visible as text as well as color.

Editors SHOULD have accessible labels.

Charts SHOULD have surrounding context that explains the conclusion even when
the SVG is not directly accessible.

Future IDE work SHOULD define keyboard navigation for panels, tabs, file trees,
run commands, diagnostics, and previews.

## 26. Testing Strategy

The current minimum gate is `npm run check`.

Changes to runtime loading, deployment configuration, asset paths, story bundle
routing, or generated output behavior SHOULD also run `npm run build`.

Changes to visible UI SHOULD be manually verified in a browser.

Future test coverage SHOULD include:

- unit tests for project/file graph helpers;
- runtime adapter tests with mocked WASM ABIs;
- story routing tests;
- Monaco provider adapter tests where practical;
- browser smoke tests;
- visual checks for rendered story sections;
- deployment artifact checks.

When Studio consumes new PDL or Algraf behavior, tests SHOULD cover the Studio
adapter contract and the upstream runtime should cover language semantics.

## 27. Documentation And Plans

This specification is the normative Studio reference.

Every scoped feature, maintenance release, or behavioral change SHOULD have an
entry in the active versioned plan before or alongside implementation.

When implementation changes behavior described by this specification, the spec
MUST be updated in the same change.

When a plan item lands, its `Status:` line MUST be updated.

When a release closes, the next versioned plan SHOULD be created before new
scope is added.

README examples and commands SHOULD remain runnable from the Studio repository
root.

## 28. Implementation Milestones

Version 0.7.0 preserves the case-study alpha and consumes shared PDL and Algraf
browser package integrations. Version 0.8.0 keeps reactive orchestration,
splits the Studio shell into focused components and workflow helpers, adds a
separate How Built walkthrough page, and adds a client-side SQL workspace.
Version 0.9.0 reorganizes Studio around route-addressable product sections and
adds the initial IDE surface:

- Vite/React shell;
- route-aware top-level navigation;
- browser-history router with GitHub Pages fallback artifact;
- Landing page;
- initial IDE page;
- Case Studies section;
- Docs section;
- Labs Interactivity route;
- two bundled stories;
- Interactivity view;
- SQL workspace embedded in IDE;
- How Built view under Docs;
- editable raw data;
- SQL.js dependency and served `sql-wasm.wasm` asset;
- reusable SQL Monaco editor;
- browser-local in-memory SQLite database creation;
- CSV import into SQLite tables;
- SQLite database upload;
- SQL query execution and result preview;
- table and schema inspection;
- query result CSV export;
- current database export through SQL.js `db.export()`;
- PDL Monaco editor from `pdl-editor`;
- Algraf Monaco editor from `algraf-editor`;
- PDL WASM runtime adapter from `pdl-wasm`;
- Algraf WASM runtime adapter from `algraf-wasm`;
- story-level named output routing;
- per-section fallback runs after edits;
- PDL context map execution;
- host-owned PDL parameter/state controls;
- Solar PDL compatibility with the `state` keyword through backtick-escaped
  column references;
- Algraf sidecar/SVG event routing;
- dependent chart re-rendering from generated files;
- How Built walkthrough covering React state ownership, package imports, WASM
  setup, editable PDL and Algraf editor components, PDL and Algraf API
  boundaries, direct chart event bridging, data flow, component organization,
  and rerun behavior;
- prepared CSV display;
- SVG chart display;
- GitHub Pages workflow;
- v0.30-compatible PDL and v0.67-compatible Algraf browser surfaces;
- shared Datafarm Monaco theme usage for CSV, JSON, and SQL editors.

Version 0.10.0 defines the IDE starter workflow:

- compact IDE surface without a hero section;
- edge-to-edge IDE workspace layout;
- one active IDE source file;
- general IDE CSV, JSON, and LJSON upload outside SQL-specific controls;
- SQL-only SQLite database upload;
- PDL and SQL preparation mode switch;
- simplified starter PDL source without `param visible_days`;
- SQL.js database seeded from the active IDE source CSV or uploaded SQLite
  database;
- SQL query result materialization as `prepared_series.csv`;
- Algraf chart rendering from the active prepared CSV artifact;
- mode-aware IDE diagnostics.

Version 0.11.0 refines the starter workflow so PDL-mode prepared artifacts can
follow renamed PDL saved CSV files across Landing, IDE, Docs How Built, Case
Studies, and Labs Interactivity while SQL mode remains fixed to
`prepared_series.csv`.

Version 0.12.0 switches Studio's PDL and Algraf package dependencies to the
published browser npm packages while preserving the v0.11 runtime and editor
workflow.

Version 0.13.0 cleans up visible Studio page copy and case-study copy while
preserving the v0.12 runtime, editor, routing, and workflow behavior.

Version 0.14.0 aligns the served WASM assets with the installed browser runtime
packages and updates the Algraf editor setup contract for `algraf-editor@0.68.5`.

Future versions should move from fixed case studies toward:

- documented project model;
- project explorer and editor tabs;
- data catalog and table preview;
- execution graph and run history;
- diagnostics panel;
- reusable preview surfaces;
- publishing workflows;
- persistence strategy.

## 29. Open Design Questions

The following questions are intentionally unresolved:

- Should Studio projects be stored as folders, archives, browser-local records,
  remote documents, or all of those?
- What is the canonical project manifest format?
- How should generated artifacts be named and invalidated?
- Should run history be persisted by default?
- What is the first non-story IDE workflow?
- Which parts of the current case-study UI become reusable project panels?
- How should Studio pin PDL and Algraf runtime versions for reproducible hosted
  projects?
- What browser storage limits are acceptable for local projects?
- What is the security model for imported user projects?

These questions should be answered in versioned plans before implementation.

## 30. Appendix: Current Runtime ABIs

PDL runtime adapter TypeScript interface:

```ts
interface PdlRuntime {
  run(source: string, files: Record<string, string>, options?: PdlRunOptions): PdlRunResult;
  editorService<T = unknown>(
    source: string,
    files: Record<string, string>,
    request: PdlEditorFeatureRequest,
    programPath?: string,
  ): PdlEditorServiceResult<T>;
}
```

Algraf runtime adapter TypeScript interface:

```ts
interface AlgrafRuntime {
  render(source: string, files: Record<string, string>): AlgrafRenderResult;
  editorService<T = unknown>(
    source: string,
    files: Record<string, string>,
    request: AlgrafEditorFeatureRequest,
    uri?: string,
  ): AlgrafEditorServiceResult<T>;
}
```

These host interfaces are part of the Studio contract. Changes to them MUST be
coordinated with runtime adapter updates, editor providers, story execution
logic, and this specification.
