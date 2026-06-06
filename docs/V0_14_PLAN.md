# Datafarm Studio v0.14.0 Plan

Status: Implemented
Target version: 0.14.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_13_PLAN.md`](V0_13_PLAN.md)
Upstream dependencies: published npm packages `pdl-wasm@0.30.0`,
`pdl-editor@0.30.0`, `algraf-wasm@0.68.5`, and `algraf-editor@0.68.5`.
Runtime WASM assets continue to load from `public/wasm/`, populated by package
WASM during ordinary Studio development and builds or by sibling WASM for
coordinated local runtime validation.

## Purpose

Studio v0.14 is a maintenance backport that aligns Studio's served Algraf
runtime and editor host setup with the published Algraf v0.68.5 browser
packages.

The v0.68.5 Algraf runtime accepts alpha hex, `rgb(...)`, and `rgba(...)`
gradient color literals. Studio previously depended on the updated npm package
metadata while still serving a stale ignored `public/wasm/algraf.wasm` file.
This release makes the default asset sync copy package-pinned WASM into the
served public directory so package upgrades and browser execution stay aligned.

## Must

- Bump Studio to v0.14.0.

  Status: Implemented. `package.json`, `package-lock.json`, and
  `docs/STUDIO_SPEC.md` carry the v0.14.0 version stamp.

- Consume the published Algraf v0.68.5 browser packages.

  Status: Implemented. `package.json` depends on `algraf-wasm@0.68.5` and
  `algraf-editor@0.68.5`, with the lockfile resolving those published packages.

- Serve package-pinned WASM by default.

  Status: Implemented. `npm run build:wasm` delegates to
  `npm run copy:package-wasm`, which copies `algraf-wasm/dist/algraf.wasm`,
  `pdl-wasm/dist/pdl.wasm`, and SQL.js WASM into `public/wasm/`.
  `npm run dev` runs the same package WASM sync before Vite starts.

- Preserve local sibling WASM validation.

  Status: Implemented. `npm run copy:wasm` still copies locally built
  `../algraf` and `../pdl` WASM artifacts into `public/wasm/` for coordinated
  cross-repo runtime checks.

- Pass the new Algraf editor setup assets.

  Status: Implemented. Studio wraps `algraf-editor` and supplies the Onigasm
  WASM URL plus Monaco editor worker factory required by the v0.68.5 editor
  package.

## Should

- Keep the browser workflow unchanged.

  Status: Implemented. The release changes runtime/editor asset wiring only;
  routing, story data, PDL sources, Algraf sources, SQL execution, diagnostics,
  and chart rendering workflows are unchanged.

- Keep PDL package assumptions stable.

  Status: Implemented. Studio continues to consume `pdl-wasm@0.30.0` and
  `pdl-editor@0.30.0`, now copying the package-local PDL WASM during default
  asset sync for consistency with the Algraf path.

## Validation

Required checks before this plan can be marked implemented:

```bash
npm run build:wasm
npm run check
npm run build
```

Manual browser verification MUST confirm:

- PDL and Algraf runtime pills reach ready state.
- Algraf editors load without the `setupAlgrafMonaco({ onigasmWasmUrl })`
  setup error.
- An Algraf chart using `gradient: ["#38673fff", "#7bce8780"]` does not emit
  `E1601`.
- Default Landing and IDE previews still render.

## Deferred

- Changing the public runtime URL contract away from `public/wasm/`.
- Automated browser smoke tests.
- Persistent project storage.
- Canonical project manifest.
