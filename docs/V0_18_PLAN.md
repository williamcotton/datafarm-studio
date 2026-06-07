# Datafarm Studio v0.18.0 Plan

Status: Implemented
Target version: 0.18.0
Owner: Studio maintainers
Related spec: [`STUDIO_SPEC.md`](STUDIO_SPEC.md)
Predecessor plan: [`V0_17_PLAN.md`](V0_17_PLAN.md)
Upstream dependencies: published npm packages `pdl-wasm@0.39.0`,
`pdl-editor@0.39.0`, `algraf-wasm@0.68.5`, and `algraf-editor@0.68.5`. All four
remain on their previously published versions; no consumer pin bumps in this
release. Runtime WASM assets continue to load from `public/wasm/`, populated by
package WASM during ordinary Studio development and builds.

## Purpose

Studio v0.18 is a landing-page copy and typography pass.

The v0.17 landing page led with the eyebrow "Browser workspace for analytical
projects" and the title "Datafarm Studio", followed by a generic blurb about
preparing data with PDL or SQL, rendering charts with Algraf, and inspecting
intermediate files. That copy described an unspecific analytical workspace and
did not name the product's most distinctive structural choice: PDL and Algraf
are two separate small languages, each with its own parser, language server,
and WASM runtime, cooperating through saved files in the browser and Arrow IPC
on the native CLI.

This release rewrites the landing hero around "Two languages. Two runtimes.",
folds the native Rust CLI and Arrow IPC story into the hero blurb so the
headline is grounded immediately, and rewrites the bottom CLI strip so the pipe
is framed as "what the CLI adds" rather than as a generic "also runs on your
terminal" footnote. The hero `h1` font size is tuned down from the global 64px
default to a `clamp(32px, 3.6vw, 44px)` so the new short title sits
proportionate to the live preview shell beside it.

No routes, story bundles, runtime adapter contracts, story workflow helpers,
WASM ABIs, panel structures, or section-card destinations are changed. The
browser runtime behavior is unchanged.

## Must

- Rewrite the landing hero copy around "Two languages. Two runtimes.".

  Status: Implemented.

  `src/components/LandingPage.tsx` changes the eyebrow from "Browser workspace
  for analytical projects" to "Datafarm Studio", changes the `h1` from
  "Datafarm Studio" to "Two languages. Two runtimes.", and replaces the
  generic prep/render/inspect blurb with a paragraph that names PDL and Algraf
  as separate small languages with their own parsers, language servers, and
  WASM runtimes, and adds that the same `.pdl` and `.ag` files build as native
  Rust CLIs that stream Arrow IPC between stages for fast pipelines on large
  data. The two hero action buttons ("Open IDE" and "View case studies") and
  the live PDL → Algraf preview shell beside the hero are otherwise untouched.

- Tune the landing hero `h1` typography to match the new short title.

  Status: Implemented.

  `src/styles.css` adds a `.landing-hero-copy h1` rule with
  `font-size: clamp(32px, 3.6vw, 44px)` and `line-height: 1.04`, overriding the
  inherited 64px global `h1` size. No other hero or section typography changes.

- Rewrite the landing CLI strip so the Arrow IPC pipe is its headline claim.

  Status: Implemented.

  `src/components/LandingPage.tsx` changes the CLI strip eyebrow from "Also
  runs on your terminal" to "Same files, native binaries", changes the `h2`
  from "Same languages, native Rust CLI." to "Native Rust CLIs, Arrow IPC
  between them.", and rewrites the paragraph to lead with Arrow IPC streaming
  ("columnar batches over stdout/stdin, no CSV roundtrip, no re-parsing
  between stages") and to land on Unix-pipeline composition. The pipe snippet
  and the three outbound links (PDL site, Algraf site, Datafarm on GitHub) are
  otherwise untouched.

- Bump release version stamps to 0.18.0.

  Status: Implemented.

  `package.json`, `package-lock.json` (root project plus `packages[""]`
  entry), and `docs/STUDIO_SPEC.md` (`Status:` line and the inline
  "implementation is version" prose, plus a new v0.18 history line) now carry
  the v0.18.0 stamp.

## Should

- Keep all consumed npm package dependency pins on their last-published
  versions.

  Status: Implemented.

  No published browser packages were cut for v0.18.0, so `pdl-wasm`,
  `pdl-editor`, `algraf-wasm`, and `algraf-editor` stay at their previous
  pins. `npm run copy:package-wasm` continues to populate
  `public/wasm/pdl.wasm` and `public/wasm/algraf.wasm` from those installed
  packages.

- Leave normative spec text alone outside the history paragraph and version
  stamps.

  Status: Implemented.

  `docs/STUDIO_SPEC.md` gains a v0.18 history line and a `Status:` /
  "implementation is version" bump. No new `MUST`/`SHOULD` requirements, no
  new routes, no new story or runtime contracts are introduced.

## Validation

```bash
npm run check
npm run dev   # spot-check the rewritten landing hero and CLI strip in a browser
```

For visible UI changes specifically, confirm:

- The hero reads "Two languages. Two runtimes." with the new sub-paragraph
  about independent PDL and Algraf toolchains plus the native Rust CLI and
  Arrow IPC note.
- The hero `h1` no longer overshadows the live preview shell beside it at
  standard desktop widths and the title remains legible at narrow widths.
- The CLI strip reads "Native Rust CLIs, Arrow IPC between them." with the
  rewritten Arrow IPC paragraph; the pipe snippet still renders as the
  right-hand column.
- The live PDL → Algraf preview still updates as you edit the CSV, PDL, or
  Algraf source.
- PDL and Algraf runtime pills still reach ready state.
