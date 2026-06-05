# Datafarm Studio Detailed Specification

Status: 0.9.0
Audience: implementers, product engineers, runtime integrators, UI engineers, editor-service authors, and test authors
Scope: browser-based Datafarm workspace, case-study publishing surface, PDL and Algraf WASM integration, Monaco editor host, in-memory project model, and planned data science IDE surface

## 0. Document Contract

This document specifies Datafarm Studio.

Studio is the browser application that brings PDL data preparation, Algraf
visualization, editable source files, data previews, diagnostics, and published
data stories into one workspace.

The current implementation is version 0.9.0. It is a Vite/React application
with a Datafarm landing page, route-aware top-level navigation, an initial
client-side IDE surface, two bundled case studies, a dedicated reactive
interactivity lab, a client-side SQLite workspace embedded in the IDE, and a
Docs section that includes the explanatory How Built walkthrough.

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

Version 0.9.0 ships a product structure around the PDL to Algraf workflow:

- Landing, a first-view introduction to Datafarm Studio as the browser IDE for
  the PDL to Algraf workflow.
- IDE, an ephemeral browser workspace with manual CSV data, PDL editing, Algraf
  editing, SQL workspace access, output preview, runtime status, and
  diagnostics.
- Case Studies, the home for two curated workflows.
- Docs, a documentation section with overview, language, runtime,
  interactivity, SQL, and How Built content.
- Labs, the retained reactive Interactivity demo.

The current Case Studies section contains:

- Solar, a state-level solar capacity and output story.
- Bikeshare, an urban bike-share revenue and operations story.

The retained Labs and Docs surfaces include:

- Interactivity, a compact PDL context and Algraf event demonstration with a
  reactive selector and dependent chart.
- SQL, a browser-local SQLite workspace powered by SQL.js for CSV import,
  database upload, schema inspection, query preview, and export, embedded in
  the IDE surface.
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
- Algraf sidecar and inert SVG event metadata can be routed through React state.
- SQL.js can load from a Studio-served WASM asset, own an in-memory SQLite
  database, import local CSV files, open uploaded SQLite database files, run
  SQL, inspect schemas, and export results without a server.
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
normalization, and result CSV export live in `src/sqlWorkspace.ts`.

Reactive demo constants live in `src/interactivityDemoData.ts`.

Story metadata and bundled source imports live in `src/storyBundles.ts`.

PDL editor and runtime integration are consumed from the sibling `pdl-editor`
and `pdl-wasm` packages.

Algraf editor and runtime integration are consumed from the sibling
`algraf-editor` and `algraf-wasm` packages.

Raw data editing lives in `src/DataEditor.tsx`.

SQL query editing lives in `src/SqlEditor.tsx`.

The SQL workspace page lives in `src/components/SqlWorkspacePage.tsx`.

The Landing, IDE, Case Studies, Docs, and route link components live under
`src/components/`.

Bundled stories live under `src/datafarm-solar/` and
`src/datafarm-bikeshare/`.

Production WASM files are served from `public/wasm/`.

GitHub Pages deployment is defined in
`.github/workflows/studio-pages.yml`.

## 5. Workspace Model

Version 0.9.0 exposes an initial client-side IDE surface but does not expose a
general persisted project workspace model.

Internally, Studio maintains editable per-story state:

- raw data by story;
- PDL source by story and section;
- Algraf source by story and section;
- runtime state for PDL and Algraf;
- per-section execution snapshots.
- IDE manual CSV source, IDE PDL source, IDE Algraf source, IDE context value,
  generated IDE output, chart result, and diagnostics.
- reactive demo context, source, generated files, chart results, and last Algraf
  event payload.
- SQL.js runtime state, active in-memory SQLite database, query text, query
  result preview, imported CSV metadata, available table schemas, selected
  table, and SQL diagnostic state.

The in-memory workspace MUST be the only source supplied to the browser WASM
runtimes. The runtimes do not read host files directly.

The in-memory workspace MUST preserve path-like names that match the source
programs. For current stories, raw files are keyed by their visible labels such
as `solar_state.csv`, `trips_raw.csv`, and `us_counties.geojson`.

Future project work SHOULD formalize this state into a reusable project model
with files, outputs, settings, run history, editor models, and publication
metadata.

### 5.1 SQL Workspace Model

Version 0.9.0 embeds the v0.8 SQL workspace in the IDE surface. The reusable
SQL workspace component MAY still render as a standalone page for development
or compatibility, but the product navigation owns it through IDE.

The SQL workspace MUST create and own a browser-local SQL.js database in memory.
The database MUST NOT require a server, remote API, or filesystem persistence.

The SQL workspace MUST initialize SQL.js with a `locateFile` function that
resolves `sql-wasm.wasm` through Studio's public asset base path.

The SQL workspace MUST let users create a fresh in-memory database.

The SQL workspace MUST let users choose local CSV files in the browser and
import them into SQLite tables in the active database.

CSV import MUST parse quoted commas, escaped quotes, CRLF, LF, and UTF-8 BOM.
The first CSV row MUST become column names. Empty, duplicate, or SQL-unsafe
column names MUST be normalized into stable SQLite identifiers.

Imported CSV values MAY be stored as SQLite `TEXT` columns in the first release.

The SQL workspace MUST let users choose `.sqlite`, `.sqlite3`, or `.db` files
and open the uploaded bytes as the active SQL.js database.

The SQL workspace MUST list user tables and expose selected-table schema
details from SQLite metadata.

The SQL workspace MUST execute user-entered SQL against the active database,
display result columns and rows when the statement returns a tabular result, and
surface SQL errors without crashing Studio.

The SQL workspace MUST export the displayed query result as CSV when the result
has columns. The SQL workspace SHOULD export the current database as a
downloadable SQLite file generated from `db.export()`.

The SQL workspace SHOULD surface that SQL.js databases are memory-backed in
this release and that large uploads are constrained by browser memory.

The SQL workspace MUST NOT add SQL semantics to PDL, SQL sources to Algraf, or
TypeScript implementations of PDL or Algraf behavior.

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

### 7.4 SQL Workspace

The SQL workspace is an IDE section, not a story section.

The SQL workspace MUST show:

- SQL.js load status;
- active database name;
- actions for creating a memory database, uploading CSV, opening SQLite, and
  exporting the active database;
- Monaco-backed SQL query editor;
- SQL result preview;
- table list and selected-table schema;
- CSV import history for the active database;
- SQL diagnostics and browser-memory persistence status.

## 8. File Map Semantics

Studio MUST supply files to runtimes as in-memory maps.

The PDL runtime file map for a section MUST include the active story raw files.

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

Future project work SHOULD replace ad hoc story file maps with a project file
graph that records which runtime produced each generated file.

## 9. PDL Runtime Integration

Studio loads PDL from `public/wasm/pdl.wasm` using the Vite public base path.
Version 0.9.0 consumes `pdl-wasm` and `pdl-editor` from the sibling PDL
repository with filesystem package installs during local development.

Version 0.9.0 requires a PDL v0.29-compatible browser package surface and a
v0.29-compatible PDL source/WASM runtime. Bundled case-study story sources MUST
remain compatible with the current story workflow. Because `state` is a PDL
declaration keyword in this runtime surface, bundled PDL sources that reference
a CSV column named `state` MUST use a backtick-escaped column reference such as
`` `state` ``. The interactivity demo MAY use v0.29 reactive `param` and
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

Version 0.9.0 targets `sql.js` `^1.13.0`. The current lockfile may resolve any
compatible SQL.js version in that range.

Studio MUST initialize SQL.js with `initSqlJs({ locateFile })`. The `locateFile`
function MUST return `publicAssetUrl("wasm/sql-wasm.wasm")` for SQL.js WASM
requests. This mapping MUST remain stable even when the bundler resolves SQL.js
to a browser build that asks for `sql-wasm-browser.wasm`.

SQL.js databases MUST remain browser-local and memory-backed in version 0.9.0.

Studio MAY construct an empty database with `new SQL.Database()` and MAY
construct an uploaded database with `new SQL.Database(new Uint8Array(buffer))`.

Studio MAY export the active database by calling `db.export()` and downloading
the returned bytes as a SQLite file.

Studio MUST close replaced or unmounted SQL.js database instances.

Studio MUST NOT route SQL execution through PDL or Algraf.

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

SQL query execution MUST occur only against the active browser-local SQL.js
database. Query execution MUST refresh table and schema metadata after a
statement runs because SQL statements may create, alter, or drop tables.

## 13. Diagnostics And Errors

Studio MUST surface runtime load errors.

Studio MUST surface PDL editor diagnostics in PDL Monaco markers.

Studio MUST surface Algraf diagnostics in Algraf Monaco markers.

Studio MUST surface SQL.js load and query errors in the SQL workspace UI.

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
- IDE page with manual CSV data, PDL editor, Algraf editor, generated CSV
  preview, rendered chart preview, runtime status, diagnostics, and embedded
  SQL workspace;
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

The embedded SQL workspace has:

- compact hero and SQL.js workspace metrics;
- browser-memory status;
- actions for new database, CSV upload, SQLite upload, and database export;
- Monaco-backed SQL editor;
- run command;
- table list;
- selected-table schema view;
- result preview table;
- query-result CSV export;
- CSV import history;
- SQL diagnostics.

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

The IDE surface SHOULD prioritize efficient repeated use by analysts over
marketing layout.

## 16. Data Science IDE Direction

Version 0.9.0 introduces the first IDE surface as a browser-local, ephemeral
workspace. It MUST include:

- local/manual CSV editing;
- PDL source editing;
- Algraf source editing;
- generated CSV preview;
- rendered chart preview;
- runtime status;
- diagnostics;
- access to the SQL workspace and SQL editor.

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

These broader project concepts remain deferred in version 0.9.0.

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
TypeScript imports. That is acceptable for version 0.9.0 but SHOULD NOT be the
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

Version 0.9.0 approximates this graph with story-level and per-section workflow
functions in `src/storyWorkflow.ts`, plus focused IDE and Interactivity page
workflow functions. `src/App.tsx` coordinates which routed surface is active and
stores the resulting case-study snapshots.

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
requests SHOULD document whether they use latest release WASM assets or locally
built sibling artifacts.

For version 0.9.0 local validation, Studio uses filesystem installs of
`pdl-wasm`, `pdl-editor`, `algraf-wasm`, and `algraf-editor` from sibling
repositories. The intended sibling package surfaces are PDL `0.29.x` and Algraf
`0.66.x`. Runtime loading still uses `public/wasm/pdl.wasm`,
`public/wasm/algraf.wasm`, and `public/wasm/sql-wasm.wasm`, populated by
`npm run copy:wasm` for coordinated local builds or by `npm run build:wasm` for
downloaded release assets plus the packaged SQL.js WASM asset.

## 22. Build And Deployment

`npm run dev` MUST start Vite for local browser testing.

`npm run check` MUST run TypeScript with `tsc --noEmit`.

`npm run build:wasm` MUST place production PDL, Algraf, and SQL.js WASM assets
in `public/wasm/`.

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

User-selected CSV and SQLite files in the SQL workspace MUST remain local to the
browser runtime unless a future product design explicitly adds persistence or
remote upload.

Studio MUST treat embedded render output as trusted only when it comes from the
audited Algraf runtime.

Future user-imported projects MUST be treated as untrusted content.

Future persistence or collaboration services MUST define authentication,
authorization, and storage boundaries before implementation.

## 24. Performance

Version 0.9.0 runs a landing page, an initial IDE workspace, small bundled case
studies, a small reactive demo, and an in-memory SQL.js workspace; it does not
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
- v0.29-compatible PDL and v0.66-compatible Algraf browser surfaces;
- shared Datafarm Monaco theme usage for CSV, JSON, and SQL editors.

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
