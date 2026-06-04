# Datafarm Studio v0.1.0 Plan

Status: Landed. This plan documents the project to date and establishes the
baseline for future Studio work.
Target version: 0.1.0.
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)

## Purpose

This document records the v0.1.0 release shape after the first implementation
slice: a browser-hosted Datafarm story application with editable raw data,
editable PDL, editable Algraf, prepared CSV output, and rendered charts.

The release was intentionally a case-study alpha, not a full IDE. Its job was to
prove that PDL and Algraf can run together in the browser and that realistic
stories can be packaged as repeatable, inspectable workflows.

Future work should treat this as the coherent starting point. New IDE features
should start in the next versioned plan instead of overloading this completed
baseline.

## Release Thesis

v0.1.0 is a **case-study runtime integration** release: ship a static Studio app
that demonstrates the Datafarm analytical workflow end to end.

The release proves five core ideas:

- PDL can prepare story tables in the browser.
- Algraf can render story charts in the browser.
- Monaco can host PDL, Algraf, CSV, and JSON editing.
- A single story-level PDL program can route named outputs to multiple story
  sections.
- Per-section edits can be run independently for exploratory changes.

## Scope Rules

- The app is a Vite/React static site.
- Runtime language logic belongs to PDL and Algraf WASM, not Studio TypeScript.
- Bundled case studies are source-controlled product content.
- User edits are in-memory only.
- GitHub Pages deployment is static.
- `npm run check` is the minimum local validation gate.
- `npm run build` is required when runtime loading, deployment, asset paths, or
  story bundle routing changes.

## Must

### 1. Vite React Studio Shell

Status: Landed.

Build a Vite/React app with a topbar, story switcher, runtime status, hero,
raw-data area, ordered story sections, and guide section.

Acceptance criteria:

- `npm run dev` starts the app for local browser testing.
- `src/main.tsx` mounts the React application.
- `src/App.tsx` owns story switching, workflow execution, and section rendering.
- The app can be deployed as a static site with a configurable Vite base path.

### 2. Bundled Solar Case Study

Status: Landed.

Ship a Solar story with raw state, seasonal, and basemap data.

Acceptance criteria:

- Story assets live under `src/datafarm-solar/`.
- The story has a root `story.pdl`.
- The story has five numbered sections.
- Every section includes PDL source, Algraf source, expected output filename,
  evidence, and conclusion copy.

### 3. Bundled Bikeshare Case Study

Status: Landed.

Ship a Bikeshare story with raw trips, station metadata, and daily weather data.

Acceptance criteria:

- Story assets live under `src/datafarm-bikeshare/`.
- The story has a root `story.pdl`.
- The story has five numbered sections.
- Every section includes PDL source, Algraf source, expected output filename,
  evidence, and conclusion copy.

### 4. PDL Browser Runtime Adapter

Status: Landed.

Load `public/wasm/pdl.wasm` and expose a TypeScript runtime wrapper for PDL runs
and editor services.

Acceptance criteria:

- The adapter checks for required WASM exports.
- Runtime calls use JSON payloads.
- PDL run results include stdout, generated files, named outputs, diagnostics,
  and error.
- PDL editor-service calls support diagnostics and language features used by
  Monaco providers.

### 5. Algraf Browser Runtime Adapter

Status: Landed.

Load `public/wasm/algraf.wasm` and expose a TypeScript runtime wrapper for
Algraf rendering and editor services.

Acceptance criteria:

- The adapter checks for required WASM exports.
- Runtime calls use JSON payloads.
- Render results include SVG, sidecar, diagnostics, and error.
- The adapter includes required browser host shims for the current Algraf WASM
  dependencies.

### 6. Monaco Editors

Status: Landed.

Host editable PDL, Algraf, CSV, and JSON sources in Monaco.

Acceptance criteria:

- PDL editor registers language configuration, theme, TextMate grammar, markers,
  and editor-service-backed providers.
- Algraf editor registers language configuration, theme, TextMate grammar,
  markers, and editor-service-backed providers.
- Data editor supports CSV and JSON source files.
- Editor model URIs remain stable for runtime feature requests.

### 7. Story Workflow Execution

Status: Landed.

Run story workflows in the browser and route prepared tables into charts.

Acceptance criteria:

- When per-section PDL sources are unchanged, Studio runs the story-level PDL
  program once and routes named outputs to sections.
- When any per-section PDL source is edited, Studio runs each section PDL
  program independently.
- Prepared CSV output is shown to the user.
- Prepared CSV is passed to Algraf as `prepared.csv` and as the section's
  declared data file.
- Supporting files and supporting outputs are passed to Algraf when declared.

### 8. Static Deployment

Status: Landed.

Deploy the Studio app to GitHub Pages.

Acceptance criteria:

- `.github/workflows/studio-pages.yml` installs dependencies, computes the Vite
  base path, builds the app, verifies WASM artifacts, and uploads `dist/`.
- The build includes non-empty `dist/wasm/algraf.wasm` and
  `dist/wasm/pdl.wasm`.

### 9. Documentation Baseline

Status: Landed.

Add a README, normative spec, v0.1 plan, and local contributor instructions.

Acceptance criteria:

- `README.md` explains what Studio is, how to run it, and how the current
  case-study surface relates to the future IDE.
- `docs/STUDIO_SPEC.md` defines the shipped contracts and deferred IDE surface.
- `docs/V0_1_PLAN.md` records the v0.1.0 baseline.
- `AGENTS.md` explains spec, plan, version, and validation discipline for
  future contributors.

## Should

### Browser Manual Verification

Status: Landed by practice.

Visible UI and runtime integration changes should be verified manually in the
browser because the current repo does not yet have automated browser tests.

### Cross-Repo Runtime Awareness

Status: Landed by scripts.

Studio should support both downloaded release WASM and locally built sibling
WASM artifacts.

### Story Asset Alignment

Status: Landed by convention.

Visible PDL/Algraf source, story metadata, raw file names, saved output names,
and `storyBundles.ts` declarations should stay aligned.

## Deferred

- General project model.
- Project explorer.
- File tabs.
- Data catalog.
- Table preview beyond text editing.
- Schema inspector.
- Execution graph.
- Run history.
- Diagnostics panel.
- Persisted local projects.
- Remote projects.
- Publication manifest.
- Automated unit tests.
- Browser smoke tests.
- Visual regression tests.
- Runtime version pinning UI.
- User-imported projects.
- Multi-user collaboration.

## Promotion Workflow

Future work should start in the next `docs/V0_<minor>_PLAN.md`.

To promote deferred work:

1. Add the feature to the active plan with a release thesis, scope rules,
   acceptance criteria, and `Status:` line.
2. Update [`STUDIO_SPEC.md`](STUDIO_SPEC.md) with normative behavior.
3. Implement the code and tests.
4. Update story assets, README examples, or deployment docs if user-visible
   behavior changes.
5. Run the relevant checks.
6. Update version stamps when the plan's release version is implemented.
