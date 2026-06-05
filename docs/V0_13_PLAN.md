# Datafarm Studio v0.13.0 Plan

Status: Planned
Target version: 0.13.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_12_PLAN.md`](V0_12_PLAN.md)
Upstream dependencies: none. This release does not require new PDL, Algraf, or
SQL.js behavior and should continue to use the published browser packages from
v0.12 unless a separate release plan changes them.

## Purpose

Studio v0.13 is a product-copy cleanup release.

The current app has working pages, but some visible copy still reads like
release-note scaffolding or implementation inventory. The most obvious example
is the Case Studies index hero:

> Published workflows stay runnable.
>
> Solar and Bikeshare now live under Case Studies. Each one keeps the same raw
> data editors, PDL preparation code, prepared CSV output, Algraf source,
> rendered charts, evidence, and conclusions.

That copy explains a migration instead of telling a user why the section exists.
This release should rewrite the public-facing page copy so Studio feels like a
coherent analytical workspace, while preserving the precise PDL, Algraf, SQL,
runtime, and evidence language where it helps users understand the product.

## Must

- Add this v0.13 plan before starting the copy pass.

  Status: Planned. `docs/V0_13_PLAN.md` defines the copy-quality release scope.

- Audit all visible Studio page copy.

  Status: Planned. The audit must cover Landing, IDE, Case Studies index,
  Solar, Bikeshare, Docs, Docs How Built, Labs Interactivity, top-level
  navigation labels, section cards, empty states, success states, and any
  repeated helper text exposed in the browser.

- Replace migration and implementation-inventory copy with user-facing product
  copy.

  Status: Planned. The Case Studies hero must stop describing that Solar and
  Bikeshare "now live" under a route and must instead explain what a case study
  offers: editable data, preparation logic, charts, and conclusions that can be
  inspected as one workflow.

- Keep technical terms only where they help the task.

  Status: Planned. PDL, Algraf, SQL.js, CSV, SVG, diagnostics, context, sidecar,
  and runtime language should stay where the UI is teaching or operating those
  concepts. Marketing and navigation surfaces should not read like API
  documentation.

- Preserve the current workflow behavior.

  Status: Planned. This release must not change story data, PDL sources, Algraf
  sources, SQL execution, runtime loading, prepared artifact selection, route
  structure, diagnostics behavior, or editor wiring except for labels and copy
  required by the copy pass.

- Update the Studio spec if the copy pass changes the published-surface
  contract.

  Status: Planned. If the release changes which surfaces are documented as
  published, educational, case-study, or lab content, `docs/STUDIO_SPEC.md` must
  be updated in the same implementation change.

## Should

- Establish a concise Studio voice for future page copy.

  Status: Planned. Copy should be direct, concrete, and useful. Prefer what the
  user can inspect, run, edit, or decide over internal phrasing such as
  "retained," "moved," "published workflows," or lists of component internals.

- Tighten copy without flattening the story voice.

  Status: Planned. Solar and Bikeshare can keep their sharper analytical claims,
  but supporting summaries, cards, evidence, and guide copy should be scanned
  for overstatement, awkward metaphors, or duplicated phrasing.

- Keep interactive and educational pages plain-spoken.

  Status: Planned. Docs How Built and Labs Interactivity should explain the
  runtime boundary clearly, but they should avoid copy that sounds like internal
  architecture notes unless the page is directly teaching that boundary.

- Avoid layout churn.

  Status: Planned. Copy edits should fit the existing responsive layout. Any CSS
  changes should be limited to preventing overflow or awkward wrapping caused by
  revised text.

## Validation

Required check before this plan can be marked implemented:

```bash
npm run check
```

Manual browser verification MUST confirm:

- Landing, IDE, Case Studies, Docs, Docs How Built, and Labs Interactivity still
  render without broken copy, overflow, or awkward wrapping on desktop and
  mobile widths.
- The Case Studies index hero no longer uses migration wording.
- Solar and Bikeshare remain editable, runnable, and auditable.
- Runtime status, diagnostics, empty states, and success states remain clear.
- PDL, Algraf, and SQL technical language is still present on surfaces where it
  is required for operation or explanation.

Run `npm run build` if implementation changes affect routing, package metadata,
deployment behavior, or static asset paths.

## Deferred

- Brand system rewrite.
- New information architecture.
- Persistent project storage.
- Canonical project manifest.
- New case-study content.
- New runtime, editor, or SQL behavior.
- Automated browser smoke tests.
