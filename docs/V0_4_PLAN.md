# Datafarm Studio v0.4.0 Plan

Status: Implemented
Target version: 0.4.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_3_PLAN.md`](V0_3_PLAN.md)
Upstream dependencies: `../pdl/docs/V0_29_PLAN.md`,
`../algraf/docs/V0_64_PLAN.md`

## Purpose

Studio v0.4 is the first reactive orchestration release for the Datafarm
ecosystem. The release goal is to connect host-owned controls and Algraf chart
events to PDL parameter/state context, then re-run the prepared-data workflow so
dependent charts update from generated files.

The intended split is:

- Studio owns UI controls, dashboard context state, event routing, workflow
  invalidation, and deciding which chart emission updates which PDL state.
- PDL owns parsing, analysis, execution, context binding semantics, and
  generated table outputs.
- Algraf owns rendering SVG plus inert interaction sidecar metadata.

This plan owns Studio integration only. It must not implement PDL language
semantics or Algraf rendering/event semantics in TypeScript.

## Must

- Consume reactive PDL context evaluation.

  Status: Implemented. Studio MUST call a PDL runtime surface that accepts source,
  in-memory files, and a context map containing declared parameter/state values.
  The Studio adapter should keep the runtime boundary explicit and small:

  ```ts
  type DashboardContext = {
    time_cutoff: number;
    active_fleet: string;
    selected_zone: string;
  };
  ```

  Studio MUST use PDL declaration defaults when no host override exists and MUST
  surface PDL runtime diagnostics without reimplementing PDL validation.

- Add host-owned parameter controls.

  Status: Implemented. Studio MUST provide the control path needed by the initial
  reactive example, such as a range input for `time_cutoff` and a select or
  segmented control for `active_fleet`. Updating a control mutates Studio's
  dashboard context and triggers PDL re-evaluation through the runtime adapter.

- Add a dedicated interactivity demo page.

  Status: Implemented. Studio MUST add a separate page or route, outside the
  existing Solar and Bikeshare case-study pages, that demonstrates the new
  interactive PDL and Algraf behavior in React components. The page MUST expose
  host-owned controls such as sliders, select boxes, segmented controls, and
  toggles that bind to PDL parameter/state context values, then show the
  resulting generated CSV output and dependent Algraf charts updating. The page
  MUST also demonstrate Algraf sidecar-driven chart events flowing back into
  Studio-owned state and then into PDL re-evaluation. This page is the canonical
  v0.4 interactive runtime demo; it should be compact, inspectable, and
  separate from the narrative case-study workflow.

- Capture Algraf sidecar emissions in the chart wrapper.

  Status: Implemented. `AlgrafChart` or its successor MUST consume Algraf's SVG plus
  sidecar, listen for supported pointer events, find the nearest or containing
  mark from sidecar pixel metadata, and emit a host-level event:

  ```ts
  onEmit({ type: "click", field: "zone", value: "Riverfront" });
  ```

  Initial snapping may use nearest-mark Euclidean distance with a documented
  threshold for point-like marks and bounds containment where the sidecar
  provides mark rectangles.

- Route chart events to PDL state bindings.

  Status: Implemented. The dashboard shell MUST own the routing from Algraf event
  payloads to PDL state names. For the first selector chart, a click event whose
  field is `zone` updates `selected_zone` in the dashboard context. Algraf
  remains unaware of `selected_zone`; PDL receives it only through the context
  map.

- Re-run the workflow on context changes.

  Status: Implemented. When a parameter or state changes, Studio MUST re-run the
  affected PDL workflow with the updated context, update generated virtual files,
  and pass the resulting CSV files to Algraf renders. The implementation should
  keep the first version conservative: correctness and clear dependency flow are
  more important than fine-grained invalidation.

- Preserve Studio runtime delegation.

  Status: Implemented. Studio MUST NOT parse PDL, evaluate PDL expressions, coerce
  PDL dynamic columns, parse Algraf source, compute Algraf layouts, or infer
  Algraf event values from source text. It may parse Algraf sidecar JSON because
  that is the host integration contract.

- Preserve existing case-study behavior.

  Status: Implemented. Solar and Bikeshare must still load, edit, run, show prepared
  CSV output, render charts, and surface diagnostics as in v0.3 unless a story
  is intentionally migrated to demonstrate the reactive loop.

- Document upstream runtime assumptions.

  Status: Implemented. Studio documentation and validation notes MUST state whether
  v0.4 was tested with local sibling PDL/Algraf WASM artifacts, packed local npm
  packages, downloaded release assets, or pinned future releases. The implemented
  validation path is local sibling PDL `0.29.x` and Algraf `0.64.x` packages with
  locally copied WASM artifacts.

## Should

- Keep Studio's spec, plans, package manifests, runtime assumptions, and story
  assets aligned with any promoted scope.

  Status: Implemented.

- Add a small reactive dashboard example.

  Status: Implemented. Prefer implementing this as the dedicated interactivity demo
  page. It should show a selector chart and a dependent receiver chart:

  - Chart A renders `zone_summary.csv` and emits clicked `zone` values.
  - Studio routes `zone` to `selected_zone`.
  - PDL re-evaluates `active_rankings.csv` using `@selected_zone`.
  - Chart B re-renders from the updated generated CSV.

- Keep event routing explicit.

  Status: Implemented. The first implementation should use straightforward routing
  code in the dashboard/story shell rather than a broad rule engine. A future
  project model can generalize bindings once more than one workflow needs them.

- Avoid unnecessary runtime work.

  Status: Implemented. Studio should debounce or batch rapid control changes where
  needed, avoid duplicate renders for stale context values, and keep clear
  loading/error states while PDL and Algraf runtimes are processing. The first
  demo keeps the graph small enough for direct full re-evaluation.

- Preserve package-based editor integration.

  Status: Implemented. The shared editor/runtime package consumption should
  remain intact. Reactive orchestration should be layered around the existing
  PDL and Algraf runtime adapters rather than forking editor components.

## Validation

Required check before this plan can be marked landed:

```bash
npm run check
```

When validating coordinated local runtime work:

```bash
npm run copy:wasm
npx vite build
```

Run `npm run build` when validating release packaging, downloaded WASM assets,
deployment behavior, or final GitHub Pages readiness.

Manual browser verification MUST confirm:

- PDL and Algraf runtime status pills reach ready state.
- Existing Solar and Bikeshare workflows still execute and render.
- Parameter controls update Studio dashboard context.
- Clicking the selector chart emits the expected `{ type, field, value }`
  payload from the Algraf sidecar.
- Studio routes the click payload to the expected PDL state binding.
- PDL re-evaluates with the updated context map and refreshes generated files.
- Dependent Algraf charts render from the refreshed generated CSV output.
- Runtime errors and diagnostics remain visible in the appropriate editor or
  output surface.
- Switching stories clears reactive snapshots without leaking state between
  stories.

## Deferred

- General project model for declaring reactive bindings.
- Multi-chart brushing, range selection, and multi-value event payloads.
- Persisted dashboard state, URL-synced state, or remote collaboration.
- Fine-grained PDL graph invalidation beyond the runtime surface provided by
  PDL v0.29.
- Automated browser smoke tests.
- Publishing or permanently pinning future PDL/Algraf npm package versions.
