# Datafarm Studio v0.20.0 Plan

Status: Proposed
Target version: 0.20.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_19_PLAN.md`](V0_19_PLAN.md)
Upstream dependencies: none. This release does not change consumed PDL or
Algraf WASM/editor pins. Story sources, runtime adapter contracts, routes,
and the visible browser behavior are unchanged.

## Purpose

Studio v0.20 is an internal maintenance release that restructures the top of
the React tree and the monolithic stylesheet so future story work, IDE work,
and adapter changes can land in scoped files rather than competing for room
in a handful of large modules. No routes, runtime adapter contracts, story
workflow helpers, panel structures, section-card destinations, or rendered
behaviors change.

Four files dominate the current maintenance cost. `src/App.tsx` (336 lines)
holds fifteen `useState` calls plus runtime loaders, routing, story
switching, and the labs interactivity dashboard. `src/components/IdePage.tsx`
(774 lines) packs thirty-two hooks across data-source selection, CSV/JSON
upload, SQL.js lifecycle, PDL preparation, Algraf rendering, the prepared-CSV
panel, and the diagnostics panel. `src/components/SqlWorkspacePage.tsx` (623
lines) holds the standalone SQL IDE plus an `embedded` reuse mode inside
IdePage, mixing the SQL.js runtime lifecycle with the table browser and
result grid. `src/styles.css` (2,672 lines) is one unscoped file covering
tokens, layout, components, page-scoped styles, Monaco theming, and media
queries.

The release introduces a `src/hooks/` directory and a `src/styles/`
directory and extracts cohesive concerns into them. STUDIO_SPEC.md does not
document component layout or hook organization, so no normative text
changes; the spec gains only the v0.20 history line and `Status:` /
"implementation is version" bump when the plan ships.

## Must

- Extract App.tsx state and effects into custom hooks.

  Status: Proposed.

  New files under `src/hooks/`: `useRuntimeInitializer.ts` owns PDL and
  Algraf WASM loading, `pdlState`, `algrafState`, `runtimeError`, and the
  cancellation cleanup that lives in App.tsx today. `useStoryState.ts` owns
  `rawDataByStory`, `pdlSourcesByStory`, `algrafSourcesByStory` and the
  matching setters, plus the story-switch reset semantics (preserve
  per-story edits, clear snapshots). `useStudioRouter.ts` wraps the
  existing `src/router.ts` helpers (`routeFromLocation`, `storyRoutePath`)
  with `popstate` listening and a `navigate(route)` callback.
  `useInteractivityDashboard.ts` owns `dashboardContext`, `lastEmit`,
  `onEmit`, and `onContextChange` for the labs interactivity page. After
  extraction, `App.tsx` is a shell component that composes the four hooks
  and renders the page tree; the internal `brandSubtitleForRoute` helper
  stays in App.tsx.

- Extract IdePage.tsx state, effects, and pure helpers.

  Status: Proposed.

  New hooks under `src/hooks/`: `useIdeDataSource.ts` owns `dataSource`,
  `sourcePath`, `sourceName`, `sourceLanguage`, `handleCsvUpload`,
  `handleJsonUpload`, and the file-input refs. `useSqlWorkspace.ts` owns
  SQL.js init (`sqlModule`, `sqlRuntimeState`), database lifecycle
  (`sqlDatabase`, `sqlDatabaseName`, `sqlDatabaseSource`), import handling
  (`sqlImport`, `handleSqliteUpload`), query and CSV synthesis
  (`sqlResult`, `sqlPreparedCsv`, `sqlLastPreparedAt`, `handleRunSql`,
  `executeSqlPreparation`), and busy/diagnostic flags, with database
  close-on-unmount and close-on-replace preserved. `useIdePdlPreparation.ts`
  owns the PDL source and snapshot:
  `useIdePdlPreparation(pdlRuntime, sourceFiles, dataSource) → { pdlSource,
  setPdlSource, snapshot, preparedCsv }`. The CSV-sync `useEffect` keeps
  its stable `sqlSourceRef` inside the hook so mutable refs do not leak.
  `useIdeAlgrafSnapshot.ts` owns Algraf source state and the Algraf
  snapshot. New components under `src/components/`: `IdePrepPanel.tsx`
  (prep-mode toggle plus artifact sidebar), `IdeSqlPanel.tsx` (compose
  `SqlTableViewer` with the SQL-mode import controls), `SqlPrepStatus.tsx`
  (the inline status sub-component). Pure helpers move to
  `src/idePdlWorkflow.ts`: `runPdlPreparation`,
  `emptyPdlPreparationSnapshot`, `diagnosticMessagesForSnapshot`,
  `diagnosticText`, `runtimeLabel`, `formatTime`, `sourceMetaFor`. After
  extraction, `IdePage.tsx` is a layout component that composes hooks,
  renders panels, and dispatches between PDL and SQL prep modes via
  `preparationMode`; no state literal beyond `preparationMode` stays in
  the component file.

- Extract SqlWorkspacePage.tsx state, effects, and rendering.

  Status: Proposed.

  New hooks under `src/hooks/`: `useSqlRuntime.ts` owns the SQL.js loader
  and database lifecycle (`sqlModule`, `sqlRuntimeState`, `database`,
  `setActiveDatabase`, `databaseRef`). `useSqlQuery.ts` owns the query
  string, executor, last result, and busy flag:
  `useSqlQuery(sqlModule, database) → { query, setQuery, queryResult,
  executeQuery, busy }`. New components: `SqlTableBrowser.tsx` (table
  selector plus schema and preview tabs), `SqlResultGrid.tsx` (result
  table with pagination). Pure helpers (`listSqlTables`, `runSqlQuery`,
  `csvFromSqlResult`, `formatSqlValue`) move into the existing
  `src/sqlWorkspace.ts`. The `embedded` flag on the page component stays
  load-bearing; the page becomes a composition rather than a co-tenant.

- Split src/styles.css into a `src/styles/` directory.

  Status: Proposed.

  Move rules verbatim — no additions, deletions, or renames — into
  `src/styles/tokens.css` (`:root` variables, typography defaults, color
  and spacing scales), `src/styles/layout.css` (`.studio-shell`,
  `.topbar`, main grid containers), `src/styles/components.css`
  (`.brand`, `.runtime-pill`, `.segmented-control`, `.panel-header`,
  `.editor-host`, `.chart-stage`, `.output-block`, button and input
  variants), `src/styles/pages.css` (page-scoped rules: `.landing-*`,
  `.ide-*`, `.sql-*`, `.story-*`, `.docs-*`, `.demo-*`),
  `src/styles/editor.css` (Monaco theme, diagnostics decorations,
  semantic highlights), and `src/styles/responsive.css` (media queries
  at the 1180px and 760px breakpoints). `src/main.tsx` imports the files
  in that order; `src/styles.css` either disappears or becomes a
  one-line `@import` manifest, whichever produces no behavior change in
  Vite (recommendation: explicit imports in `main.tsx`).

- Hold runtime adapter contracts.

  Status: Proposed.

  `src/pdlRuntime.ts`, `src/algrafRuntime.ts`,
  `src/pdlEditorProviders.ts`, and `src/algrafEditorProviders.ts` are
  out of scope. WASM ABIs, JSON payload shapes, Monaco provider
  contracts, and TextMate grammars in `src/grammars/` are unchanged.
  Story bundle shapes in `src/storyBundles.ts` and the section contracts
  (`programPath`, `outputName`, `dataFile`) are unchanged.

- Bump release version stamps to 0.20.0.

  Status: Proposed.

  Updates: `package.json`, `package-lock.json` (root project plus
  `packages[""]` entry), and `docs/STUDIO_SPEC.md` (`Status:` line, the
  inline "implementation is version" prose, plus a new v0.20 history
  line). Consumed PDL/Algraf WASM and editor pins do not change;
  AGENTS_STUDIO.md "NPM package version checks" still apply if a future
  change wants to bump those.

## Should

- Land each extraction in its own commit on the v0.20 branch.

  Status: Proposed.

  Suggested order: `App.tsx → hooks` first (smallest, sets the hook
  pattern), then `IdePage`, then `SqlWorkspacePage`, then `styles.css`.
  Each commit must pass `npm run check` independently and re-verify the
  visible-UI checklist for the touched surface before the next commit
  begins.

- Add a one-paragraph header comment to each new hook file.

  Status: Proposed.

  Each header names the state owned, the runtime adapters consumed, and
  the cleanup guarantees (close-on-unmount, cancellation). Keep header
  comments tight; do not generate JSDoc.

- Document the `embedded` flag on `SqlWorkspacePage` as load-bearing.

  Status: Proposed.

  A short comment at the page component head explains the reuse path
  from IdePage. Whether to replace `embedded` with a separate
  `EmbeddedSqlTableViewer` component or a context flag is deferred to a
  later release.

- Leave normative spec text alone outside the history paragraph and
  version stamps.

  Status: Proposed.

  `docs/STUDIO_SPEC.md` gains a v0.20 history line and the `Status:` /
  "implementation is version" bump. No new `MUST`/`SHOULD` requirements,
  no new routes, no new story or runtime contracts are introduced.

- Defer HowBuiltPage extraction, CSS Modules conversion, and an
  automated UI test runner to later releases.

  Status: Proposed.

  `HowBuiltPage.tsx` (747 lines) has low coupling to runtime state;
  extracting `useParametrizedPdlPrep`, `HowBuiltSlider`, and
  `CodeSnippets` is safer once the v0.20 hook pattern is established
  (move it in v0.21). CSS Modules conversion is blocked on a Vite
  configuration decision and on resolving class collisions
  (`.segmented-control`, `.panel-header`); plan separately. Adding a
  test runner changes the contract of `npm run check`/`npm run build`
  and needs its own release thesis.

## Validation

```bash
npm run check
npm run build
```

For visible UI changes specifically, confirm after each commit and
before marking the plan implemented:

- PDL and Algraf runtime pills reach ready state.
- PDL outputs populate the prepared CSV panel in both Solar and
  Bikeshare stories.
- Prepared CSV files are available to Algraf charts.
- Charts render for both stories.
- Runtime and language diagnostics appear in the relevant editors.
- Switching stories clears snapshots without losing per-story source
  edits.
- IDE: CSV upload, JSON upload, and SQLite upload populate the data
  panel as before.
- IDE: PDL prep mode produces a prepared CSV; Algraf consumes it; the
  chart renders.
- IDE: SQL prep mode runs the query, populates the prepared CSV,
  Algraf consumes it; the chart renders.
- IDE: switching prep mode between PDL and SQL does not strand state
  from the prior mode.
- Standalone SQL Workspace page: query execution, result grid
  pagination, table browser schema/preview tabs, and import/export
  behave identically.
- Labs interactivity demo: selector emit reaches the receiver chart,
  and the context summary updates.
- CSS: a visual diff in DevTools against `main` on the landing, IDE,
  case studies, labs, and docs pages shows no rule changes.
