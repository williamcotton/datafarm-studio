# Datafarm Studio v0.12.0 Plan

Status: Implemented
Target version: 0.12.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_11_PLAN.md`](V0_11_PLAN.md)
Upstream dependencies: published npm packages `pdl-wasm@0.30.0`,
`pdl-editor@0.30.0`, `algraf-wasm@0.67.0`, and `algraf-editor@0.67.0`.
Runtime WASM assets continue to come from `public/wasm/`, populated by
`npm run build:wasm` for release builds or `npm run copy:wasm` for coordinated
local runtime validation.

## Purpose

Studio v0.12 switches the app from local sibling package installs to the
published PDL and Algraf browser package surfaces.

The package dependency graph should now match the manual publishing path for the
PDL and Algraf npm packages. Studio still loads runtime WASM from the public
asset path so release builds can download latest release assets and coordinated
local runtime checks can copy sibling WASM artifacts without changing package
manifests.

## Must

- Add this v0.12 plan before release-packaging implementation.

  Status: Implemented. `docs/V0_12_PLAN.md` defines the published package
  dependency switch.

- Replace Studio local package dependencies with published npm versions.

  Status: Implemented. `package.json` depends on `pdl-wasm@0.30.0`,
  `pdl-editor@0.30.0`, `algraf-wasm@0.67.0`, and `algraf-editor@0.67.0`.

- Refresh the lockfile from the npm registry.

  Status: Implemented. `package-lock.json` must resolve the PDL and Algraf
  browser packages from published tarballs, not sibling `file:` paths.

- Keep runtime WASM loading behavior unchanged.

  Status: Implemented. Studio still loads `public/wasm/pdl.wasm`,
  `public/wasm/algraf.wasm`, and `public/wasm/sql-wasm.wasm`.
  `npm run build:wasm` remains the release path, while `npm run copy:wasm`
  remains available for coordinated local runtime validation.

- Update Studio spec and README dependency assumptions.

  Status: Implemented. Current documentation states that package dependencies
  resolve from published npm packages and records the consumed PDL and Algraf
  package versions.

## Should

- Preserve the existing browser workflow.

  Status: Implemented. The dependency change should not alter routing, editor
  behavior, PDL execution, Algraf rendering, SQL mode, case studies, Docs, or
  Labs behavior.

- Keep the change narrow.

  Status: Implemented. This release does not add new Studio features, new
  runtime behavior, or new package surfaces.

## Validation

Required checks before this plan can be marked implemented:

```bash
npm install
npm run check
npm run build
```

Manual browser verification is not required for this packaging-only release,
but a release candidate SHOULD still confirm that PDL and Algraf runtime pills
reach ready state and the default IDE chart renders.

## Deferred

- Persistent project storage.
- Canonical project manifest.
- Browser-local project save/load.
- File-tree or multi-file project UI.
- Explicit multi-output artifact picker.
- Automated browser smoke tests.
