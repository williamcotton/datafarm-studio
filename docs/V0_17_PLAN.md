# Datafarm Studio v0.17.0 Plan

Status: Implemented
Target version: 0.17.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_14_PLAN.md`](V0_14_PLAN.md)
Upstream dependencies: published npm packages `pdl-wasm@0.39.0`,
`pdl-editor@0.39.0`, `algraf-wasm@0.68.5`, and `algraf-editor@0.68.5`. All four
remain on their previously published versions; no consumer pin bumps in this
release. Runtime WASM assets continue to load from `public/wasm/`, populated by
package WASM during ordinary Studio development and builds.

## Purpose

Studio v0.17 is a landing-page and documentation backport that retroactively
plans the gap between the v0.14 release stamp and the actual code stamps that
shipped at 0.15 and 0.16 without dedicated plan files. It scopes that drift
plus the new "Native CLI" landing-page strip and the rewritten README so that
the next reader of `docs/` can see one consolidated entry covering everything
that landed between v0.14 and v0.17.

No story bundles, runtime adapter contracts, route shapes, story workflow
helpers, or WASM ABIs are introduced or changed in this release. The browser
runtime behavior is unchanged.

## Must

- Add a CLI strip to the landing page.

  Status: Implemented.

  `src/components/LandingPage.tsx` grows a new `.landing-cli-strip` section
  below `.landing-section-grid`. It contains an "Also runs on your terminal"
  eyebrow, a short two-column body with copy on the left and a `pdl … |
  algraf …` Arrow-IPC pipe snippet on the right, and three outbound links to
  the PDL site, the Algraf site, and the Datafarm GitHub. The hero, live
  PDL → Algraf preview, and the five-card section grid are otherwise
  untouched. The `Runtime Model` section card copy is also updated to
  acknowledge both the in-browser runtime and the native Rust CLIs.

- Rewrite the README so it matches the shipped page surface.

  Status: Implemented.

  The opening paragraph now mentions the landing page, free-form IDE, two case
  studies, docs (including the How Built walkthrough), and the interactivity
  lab — not just "two editable case studies". A new "Pages" route table sits
  under the opening paragraph. The "tour in five panels" is rewritten as a
  self-contained day/value mini-demo (raw CSV, PDL preparation, prepared CSV,
  Algraf chart source, story evidence markdown) so the reader can grasp the
  Studio shape without depending on the bundled stories.

- Add a "Native CLI companions" section to the README.

  Status: Implemented.

  Placed between "Runtime model" and "Project layout". Includes Homebrew
  install commands for both `pdl` and `algraf`, the cross-tool Arrow-IPC pipe
  snippet, and links to the PDL and Algraf repositories.

- Fix stale upstream package version mentions in the README.

  Status: Implemented.

  Prose now reads `pdl-wasm@0.39.0` and `pdl-editor@0.39.0` to match
  `package.json`. `algraf-wasm@0.68.5` / `algraf-editor@0.68.5` were already
  current.

- Bump release version stamps to 0.17.0.

  Status: Implemented.

  `package.json`, `package-lock.json` (root project plus `packages[""]`
  entry), and `docs/STUDIO_SPEC.md` (`Status:` line and the inline
  "implementation is version" prose) now carry the v0.17.0 stamp. v0.15 and
  v0.16 maintenance bumps that shipped without dedicated plan files are
  rolled into this release retroactively.

- Drop the README pointer to `docs/STUDIO_SPEC.md` and the trailing "Release
  discipline" paragraph.

  Status: Implemented.

  The README no longer asks readers to navigate to the normative spec or to
  per-release plan files. Those artifacts stay under `docs/` for implementers
  and remain referenced from the plan/spec themselves, but they are no longer
  call-outs on a user-facing README.

## Should

- Keep all consumed npm package dependency pins on their last-published
  versions.

  Status: Implemented.

  No published browser packages were cut for v0.17.0, so `pdl-wasm`,
  `pdl-editor`, `algraf-wasm`, and `algraf-editor` stay at their previous
  pins. `npm run copy:package-wasm` continues to populate
  `public/wasm/pdl.wasm` and `public/wasm/algraf.wasm` from those installed
  packages.

- Leave normative spec text alone.

  Status: Implemented.

  `docs/STUDIO_SPEC.md` gets only a `Status:` bump and a current-version
  prose update. No new `MUST`/`SHOULD` requirements, no new routes, no new
  story or runtime contracts are introduced.

## Validation

```bash
npm run check
npm run dev   # spot-check the landing page and new CLI strip in a browser
```

For visible UI changes specifically, confirm:

- PDL and Algraf runtime pills reach ready state.
- The new `.landing-cli-strip` renders below the section grid without
  collapsing the page.
- The cross-tool pipe snippet reads in light-mode styling matching the rest
  of the demo install strips.
- The existing live preview (CSV → PDL → Algraf) still updates as you edit.
