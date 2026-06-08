# Datafarm Studio v0.19.0 Plan

Status: Proposed
Target version: 0.19.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_18_PLAN.md`](V0_18_PLAN.md)
Upstream dependencies: requires future `algraf-wasm@0.71` and
`algraf-editor@0.71` npm releases that ship the v0.71 Algraf surface
(chart-scoped `Glyph` mark replaces the `Inset` block). The currently
published packages are `algraf-wasm@0.68.5` and `algraf-editor@0.68.5`,
which still know `Inset` and do not yet know `Glyph`. The Solar Step 04
chart will fail to parse against the published WASM until those packages
are bumped; `npm run copy:wasm` against a locally built `../algraf` sibling
on the 0.71 branch is the supported workaround in the meantime.

## Purpose

Studio v0.19 ports the Solar story sources to the v0.71 Algraf surface and
removes lingering `Inset`-era prose from story bundles, the case-study
narrative, and bundled data notes.

Algraf 0.71 replaces the `Inset(...) { Space(...) }` block with a
chart-scoped `Glyph name(data:, key:, scales:) { Space+ }` declaration that
is invoked as an ordinary geometry call inside a host `Space`. `minSize` /
`maxSize` on the old `Inset` mark are subsumed by a chart-level
`Scale(size: column, range: [min, max])`. The Solar Step 04 chart is the
only Studio story that used `Inset`, so the migration is narrow but it does
touch a runtime contract: the bundled WASM must understand the new
keyword.

This release exists to keep Studio's checked-in sources lined up with the
language the consumed runtime will eventually speak. Bumping the consumed
package pins is conditional on the upstream npm publish and is therefore
covered by a separate Should item, not the Must items.

No routes, story panel structure, runtime adapter contracts, story
workflow helpers, or section-card destinations change. The browser
behavior is unchanged where the chart still parses; it regresses on Solar
Step 04 against the currently pinned WASM, which the upstream-pin Should
item resolves.

## Must

- Port `src/datafarm-solar/04/seasonal-pie-map.ag` to the chart-scoped
  `Glyph` mark.

  Status: Implemented.

  The source now declares `Glyph pie(data: mix, key: [state => state],
  scales: "shared") { Space(generation_gwh, coords: "polar", theta: "y") {
  ... } }` at chart scope, sets the pie footprint via a chart-level
  `Scale(size: generation_gwh, range: [22, 54], label: "Annual generation
  (GWh)")`, and invokes the glyph as `pie(size: generation_gwh, clip:
  "circle", padding: 1)` inside the host `Space(long * lat, projection:
  "albers_usa", data: points)`. The `Inset(...) { ... }` block, `match:`
  argument, `minSize`/`maxSize` arguments, and `guides: false` are removed
  because the new surface expresses each through ordinary chart pieces.

- Mirror the new chart source in `src/datafarm-solar/STORY.md`.

  Status: Implemented.

  The Step 04 section subtitle reads "*(glyph pies on a map)*", the
  embedded code block matches the ported `.ag`, and the "Note on the DSL
  surface used" paragraph names "chart-scoped `Glyph pie(...) { Space(count,
  coords:"polar") }` pies invoked from a host `Space`" instead of the old
  `Inset{ Space(count, coords:"polar") }` shorthand.

- Refresh `Inset`-era prose in story bundles and bundled data notes.

  Status: Implemented.

  `src/storyBundles.ts` Step 04 summary and evidence strings now say
  "glyph pies" / "glyph pie". `src/datafarm-solar/04/seasonal-mix.pdl`
  header comment reads "for glyph pies". `src/datafarm-solar/data/README.txt`
  references "us_city_bubbles / glyph pie-map examples" instead of the old
  `inset_city_pies` name. CSS `inset:` declarations in `src/styles.css` are
  unrelated and stay untouched.

- Upgrade the IDE workspace to show a SQLite table viewer in SQL mode.

  Status: Implemented.

  When `SQL` is selected in the IDE sidebar, the source CSV/JSON input panel (`DataPanel`) is replaced with the newly added [SqlTableViewer](file:///Users/administrator/Projects/datafarm/studio/src/components/SqlTableViewer.tsx) component. This component dynamically queries the loaded database to list all tables, inspect their schemas, and preview the first 50 rows of data. It refreshes automatically whenever the SQLite database changes or a query runs.

## Should

- Bump consumed Algraf package pins to `algraf-wasm@0.71.x` /
  `algraf-editor@0.71.x` once those releases are published to npm; then
  bump Studio version stamps (`package.json`, `package-lock.json`,
  `docs/STUDIO_SPEC.md`) to 0.19.0.

  Status: Pending upstream publish.

  Until the packages ship, the published Studio remains on
  `algraf-wasm@0.68.5` and the new `.ag` sources will not parse in the
  browser. `npm run copy:wasm` against a locally built `../algraf`
  sibling on the 0.71 branch is the supported workaround for coordinated
  local validation. Do not mark v0.19 Implemented while the consumed
  package pins still point at 0.68.5.

- Leave normative spec text alone outside the history paragraph and
  version stamps tied to the pin bump.

  Status: Pending alongside the pin bump.

  Studio does not surface the `Glyph` keyword in its own product copy or
  adapter contracts; the spec only needs the v0.19 history line and the
  `Status:` / "implementation is version" lines when the pin bump lands.

## Validation

Source-level (no runtime dependency on the new Algraf release):

```bash
npm run check
```

Once the consumed package pins land on 0.71:

```bash
npm run build         # downloads/uses the bumped WASM, type-checks, builds dist/
npm run dev           # spot-check Solar Step 04 in a browser
```

For the visible Solar Step 04 chart specifically, confirm:

- The `seasonal-pie-map.ag` source parses with no diagnostics in the
  Algraf editor.
- The rendered chart shows one pie per state at the
  `albers_usa`-projected centroid, sized by `generation_gwh` along the
  `[22, 54]` range, clipped to a circle with `padding: 1`.
- The shared fill scale legend (Winter / Shoulder / Summer) renders once
  at the chart level.
- Switching to another Solar section and back preserves the chart and
  does not strand the PDL outputs.

For the IDE SQLite Table Viewer, confirm:

- Switching preparation mode to `SQL` replaces the left input editor with the SQL Table Viewer.
- The dropdown list displays all tables in the active database (including default `manual_series`).
- The **Schema** tab renders the table columns, types, nullability, and primary key status correctly.
- The **Preview** tab queries and renders the first 50 rows of the selected table.
- Opening a SQLite database (`.db` or `.sqlite` file) correctly loads its tables into the selector dropdown.
