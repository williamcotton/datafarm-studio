# Datafarm Studio v0.8.0 Plan

Status: Implemented
Target version: 0.8.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_7_PLAN.md`](V0_7_PLAN.md)
Upstream dependencies: local sibling `pdl-wasm`, `pdl-editor`,
`algraf-wasm`, and `algraf-editor` packages. This release does not require new
PDL or Algraf runtime behavior.

## Purpose

Studio v0.8 adds a client-side SQLite workspace powered by `sql.js`.

The release goal is to give Studio an in-browser relational scratchpad for
manual data exploration before the larger IDE shell lands. The database remains
ephemeral and client-owned: users can create an in-memory database, upload CSV
files into SQLite tables, upload an existing SQLite database file, query it, and
export results without any server dependency.

## Must

- Add the SQL.js dependency and browser WASM asset.

  Status: Implemented. Studio MUST add `sql.js` targeting `^1.13.0`, make
  `sql-wasm.wasm` available as a served static asset, and initialize SQL.js
  with a `locateFile` function that resolves the WASM URL through Studio's
  public asset path.

- Create an in-memory SQLite workspace.

  Status: Implemented. Studio MUST expose a SQL workspace surface that creates and
  owns a browser-local SQLite database in memory. The database MUST NOT require
  a server, remote API, or filesystem persistence.

- Support manual CSV upload into SQLite tables.

  Status: Implemented. Users MUST be able to choose local CSV files in the browser,
  import them into SQLite tables, inspect table names and schemas, and query
  the imported data.

- Support SQLite database upload.

  Status: Implemented. Users MUST be able to choose an existing `.sqlite`,
  `.sqlite3`, or `.db` file in the browser and open it as the active SQL.js
  database.

- Support SQL query execution and result preview.

  Status: Implemented. The SQL workspace MUST provide a Monaco-backed SQL editor,
  execute user queries against the active in-memory database, display result
  columns and rows, and surface SQL errors in the UI.

- Add a reusable SQL editor component.

  Status: Implemented. Studio MUST add a reusable SQL editor surface that uses
  Monaco's built-in `sql` language mode and the shared Datafarm editor theme.
  The editor MUST support controlled query text, stable model URIs, change
  callbacks, disposal cleanup, and the same basic sizing/typography behavior as
  the existing data editor surfaces.

- Support table and schema inspection.

  Status: Implemented. The SQL workspace MUST list available tables and expose a
  schema view for selected tables.

- Support client-side export.

  Status: Implemented. Users MUST be able to export query results as CSV. Users
  SHOULD also be able to export the current database as a downloadable SQLite
  file generated from `db.export()`.

- Keep PDL and Algraf separate.

  Status: Implemented. This release MUST NOT add SQL semantics to PDL, SQL sources
  to Algraf, or TypeScript implementations of PDL or Algraf behavior.

## Should

- Keep the first SQL surface focused.

  Status: Implemented. The first release should prioritize database creation,
  CSV/database upload, query execution, result preview, schema inspection, and
  export over broader IDE features.

- Handle browser-only constraints explicitly.

  Status: Implemented. The UI should explain or surface that SQL.js databases are
  memory-backed in this release and that large uploads may be limited by
  browser memory.

- Keep SQL state easy to move into the future IDE.

  Status: Implemented. SQL runtime state, query text, query results,
  imported-table metadata, SQL diagnostics, and the SQL editor component should
  use small typed Studio interfaces that can later be hosted inside the v0.9
  IDE surface.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

Run `npm run build` when validating final release packaging, static WASM asset
paths, deployment behavior, or GitHub Pages readiness.

Manual browser verification MUST confirm:

- SQL.js loads and reaches ready state.
- Creating a new in-memory database succeeds.
- Uploading a CSV file creates a queryable SQLite table.
- Uploading a `.sqlite`, `.sqlite3`, or `.db` file opens a queryable database.
- Table and schema lists update after database creation or upload.
- A valid SQL query renders columns and rows.
- SQL queries are edited in a Monaco-backed SQL editor with SQL syntax
  highlighting and the shared Datafarm editor theme.
- An invalid SQL query surfaces an actionable error without crashing Studio.
- Query results export as CSV.
- The current database exports as a downloadable SQLite file when that control
  is present.
- Existing Solar, Bikeshare, Interactivity, and How Built behavior remains
  unchanged.

## Deferred

- Persistent browser storage.
- File System Access API integration.
- Server-side SQLite.
- Remote database loading.
- SQL integration into PDL or Algraf.
- Project save/load.
- IDE and navigation reorganization.
