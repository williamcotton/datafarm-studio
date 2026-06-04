# Datafarm Studio v0.3.0 Plan

Status: Implemented
Target version: 0.3.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_2_PLAN.md`](V0_2_PLAN.md)
Upstream dependencies: `../pdl/docs/V0_27_PLAN.md`,
`../algraf/docs/V0_63_PLAN.md`

## Purpose

Studio v0.3 migrates Studio's PDL editor integration toward the first-party
browser packages planned for PDL v0.27, and consumes the matching Algraf v0.63
packages in the same local-dev pass. The release goal is to remove Studio's
local PDL and Algraf TextMate grammar copies and duplicated browser
editor/provider wiring, while preserving Studio's case-study workflow, local
coordinated development flow, and runtime delegation.

This plan owns only the Studio consumption work. The shared PDL and Algraf
editor assets, Monaco integrations, runtime packages, and demo migrations are
tracked in the sibling language repositories.

## Must

- Consume the PDL Monaco integration from PDL.

  Status: Implemented. Studio MUST use the PDL v0.27 Monaco integration from the
  sibling PDL repo or the published `pdl-editor` package instead of maintaining
  a local PDL grammar copy and local PDL Monaco provider adapter.

- Preserve local and package-based WASM paths.

  Status: Implemented. Studio MUST continue to support local sibling WASM validation
  with `npm run copy:wasm`. Once `pdl-wasm` is published, Studio MAY switch its
  release-oriented PDL runtime loading to that npm package, but it MUST NOT
  commit generated PDL WASM binaries into the Studio source repository.

- Support unpublished package development.

  Status: Implemented. Studio MUST support a documented local development workflow
  that does not require publishing `pdl-wasm` or `pdl-editor` while iterating on
  cross-cutting editor/runtime changes. The workflow MUST include:

  - Source mode for daily work. Studio consumes sibling PDL editor/runtime
    source or build output from `../pdl`, runs `npm run copy:wasm` for local
    WASM artifacts, and passes a caller-provided local `wasmUrl` or structural
    runtime object through the shared editor API.
  - Packed mode for package-surface checks. Studio installs local `pdl-wasm` and
    `pdl-editor` tarballs produced from `../pdl` with `file:` dependencies or
    one-off `npm install` commands, then runs the normal type/build/browser
    validation before any npm publish.

  `npm link` MAY be documented as an advanced workflow, but it should not be the
  default because linked React and Monaco dependencies can diverge from Studio's
  app dependencies.

- Remove local PDL static-grammar ownership.

  Status: Implemented. `src/grammars/pdl.tmLanguage.json` MUST stop being the
  authoritative PDL grammar for Studio. Studio should rely on the canonical PDL
  editor assets consumed through the shared Monaco integration.

- Preserve Studio-specific runtime loading and workflow state.

  Status: Implemented. Studio MUST continue to own raw/story files, per-story source
  state, story switching, run-all behavior, section-level execution, prepared
  CSV routing, and panel layout. It may either own PDL WASM loading directly or
  use `pdl-wasm` as a loader, as long as Studio keeps the same runtime behavior
  and local coordinated testing path.

- Keep shared editor consumption thin.

  Status: Implemented. Studio MUST consume the shared PDL editor as a reusable
  editor surface by passing runtime, files, diagnostics, value, change handler,
  and model URI from Studio state. Studio MUST NOT adopt PDL demo-specific run
  buttons, page layout, output panels, or runtime download policy from the
  shared editor package.

- Exercise the extensible API path.

  Status: Implemented. Studio MUST use the shared editor through public, documented
  interfaces that are suitable for other hosts: host-provided runtime,
  host-provided files and diagnostics, model URI control, editor option/theme
  overrides when needed, and explicit provider setup/cleanup behavior. Studio
  should avoid importing private demo-only internals from the PDL package.

- Preserve model URI and program-path behavior.

  Status: Implemented. PDL editor-service requests from Studio MUST continue to use
  model-specific virtual paths so diagnostics and relative file behavior match
  story and section files.

- Keep PDL semantics delegated upstream.

  Status: Implemented. Studio MUST NOT implement PDL parsing, analysis,
  diagnostics, completion, hover, formatting, semantic tokens, symbols,
  definition/reference, or rename in TypeScript.

## Should

- Preserve the v0.2 case-study surface.

  Status: Implemented. Solar and Bikeshare should continue to load, execute,
  display prepared CSV output, and render Algraf charts as they did in v0.2.

- Document the cross-repo dependency.

  Status: Implemented. Studio documentation should state whether validation used
  local sibling PDL sources/WASM, published `pdl-editor` and `pdl-wasm` npm
  packages, downloaded GitHub Release WASM assets, or some combination of those
  sources.

- Validate both development and package-like paths when practical.

  Status: Implemented. Studio should keep a fast local path for sibling repo edits
  and a package-like path for checking the public package surface before a
  release. Generated local package tarballs and WASM artifacts should live in
  ignored package `dist/` directories or workspace `artifacts/`, not in tracked
  Studio source.

- Leave Algraf migration for its matching plan unless implemented together.

  Status: Implemented. Studio consumes Algraf v0.63's mirrored
  `editors/monaco/` integration and `algraf-editor`/`algraf-wasm` packages in
  the same change. Studio documentation and validation mention both upstream
  assumptions.

## Validation

Required checks before this plan can be marked landed:

```bash
npm run check
```

When validating local coordinated runtime/editor work, also run:

```bash
npm run copy:wasm
```

Use a direct Vite build when validating with local sibling WASM artifacts and
without downloading release WASM:

```bash
npx vite build
```

Run `npm run build` when validating release packaging, downloaded WASM assets,
deployment behavior, or final GitHub Pages readiness.

Manual browser verification MUST confirm:

- Studio's PDL highlighting matches the PDL demo for representative v0.26+
  syntax, including scalar, aggregate, and window function scopes.
- Studio can run against unpublished local PDL and Algraf editor/runtime builds
  without requiring npm publication.
- PDL and Algraf runtime status pills reach ready state.
- Solar and Bikeshare story-level PDL programs execute successfully.
- Per-section PDL execution still works after edits.
- Prepared CSV outputs populate the prepared data panels.
- Prepared CSV files are available to Algraf charts.
- Charts render for both stories.
- PDL diagnostics, hover, completion, semantic tokens, symbols, and
  rename/reference behavior still come from the upstream PDL editor service.
- Algraf diagnostics, hover, completion, signature help, formatting, semantic
  tokens, code actions, symbols, definition/reference, and rename behavior still
  come from the upstream Algraf editor service.

## Deferred

- Publishing or pinning permanent PDL npm packages.
- Publishing or pinning permanent Algraf npm packages.
- General Studio project model.
- Project explorer and file tabs.
- Diagnostics panel.
- Persisted local or remote projects.
- Automated browser smoke tests.
