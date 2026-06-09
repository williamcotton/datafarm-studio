# AGENTS_STUDIO.md

Guidance for working in the Datafarm Studio repository.

## What Studio is

Datafarm Studio is the browser workspace for Datafarm projects. Today it is a
Vite/React app that ships two editable case studies, Solar and Bikeshare. Each
case study shows raw data, PDL preparation code, Algraf chart code, prepared CSV
output, rendered charts, evidence, and conclusion copy.

The product direction is a data science IDE. Treat the current case studies as
the first marketing and publishing surface, not as the whole product model.

Studio is a host for PDL and Algraf browser runtimes. Do not reimplement PDL
parsing/execution or Algraf parsing/rendering in TypeScript. Language behavior
belongs in `../pdl` and `../algraf`; Studio adapts their WASM and editor-service
ABIs into the browser UI.

## Spec and versioned plans

Three artifacts govern behavior, and they must stay in sync:

1. **`docs/STUDIO_SPEC.md` - the normative reference.** It describes what
   Studio does, what the current v0.1 surface guarantees, and which IDE concepts
   are deferred. Read the relevant section before implementing or changing
   behavior. The spec uses RFC-2119-style keywords (`MUST`, `SHOULD`, `MAY`,
   `MUST NOT`); honor them.

2. **`docs/V0_<minor>_PLAN.md` - per-release planning files.** Each release gets
   one. A plan states the release thesis, lists Must/Should items with a
   `Status:` line each, and records deferred work. Plans are guidance, not
   normative: a feature is real only when the spec says `MUST`/`SHOULD` and the
   code implements it. The earliest unreleased plan is the active target.

3. **The code and assets** under `src/`, `public/`, `.github/`, plus tests,
   story files, and generated outputs when intentionally checked in.

### How they tie together

- **Promoting deferred IDE work** into a release: add it to the active plan,
  update the normative spec section, then implement + test + document it.
- **The spec must match the implementation.** If you ship a project model,
  panel, workflow, runtime adapter, route, diagnostic surface, deployment
  behavior, or story contract, document it in the spec in the same change.
- **Keep examples and stories runnable.** PDL and Algraf snippets in README,
  plans, and story files must use syntax accepted by the currently consumed
  runtimes.
- **When a plan item lands, update its `Status:` line.** When a release ships,
  start the next `V0_<minor>_PLAN.md` before adding new scope.
- **Create the plan artifact even if work starts first.** Every feature,
  maintenance release, or release-scoped fix should have a current/new plan
  entry. If the work is outside the active plan's purpose, start the next minor
  plan rather than appending to old completed scope.
- **When a numbered plan is implemented, align version stamps.** Update
  `package.json`, `package-lock.json`, `docs/STUDIO_SPEC.md`, and any future
  Studio manifests or generated docs that carry the release version.
- **Cross-repo runtime assumptions must be explicit.** If a Studio change
  depends on new PDL or Algraf behavior, document whether it requires latest
  release WASM, locally built sibling WASM, or a future upstream release.

If the spec, plan, and code disagree, treat it as drift to fix. Reconcile all
three rather than picking one.

## Project layout

Application code lives in `src/`, with React entry points in `src/main.tsx` and
the top-level state container in `src/App.tsx`.

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Main shell state, story switching, runtime loading |
| `src/components/` | Shell controls, story panels, story sections, interactivity page |
| `src/storyWorkflow.ts` | Story-level and per-section workflow execution helpers |
| `src/studioTypes.ts` | Shared Studio runtime, snapshot, and interactivity types |
| `src/studioUtils.ts` | Shared diagnostics, CSV, formatting, and snapshot helpers |
| `src/interactivityDemoData.ts` | Reactive demo defaults, sources, and constants |
| `src/storyBundles.ts` | Story metadata, default sources, raw data file maps |
| `src/PdlEditor.tsx` | Monaco host for PDL |
| `src/pdlEditorProviders.ts` | PDL Monaco providers backed by PDL editor services |
| `src/pdlRuntime.ts` | PDL WASM loader and JSON ABI wrapper |
| `src/AlgrafEditor.tsx` | Monaco host for Algraf |
| `src/algrafEditorProviders.ts` | Algraf Monaco providers backed by Algraf editor services |
| `src/algrafRuntime.ts` | Algraf WASM loader and JSON ABI wrapper |
| `src/DataEditor.tsx` | Monaco host for CSV/JSON data |
| `src/grammars/` | TextMate grammars copied from PDL and Algraf editor assets |
| `src/datafarm-solar/` | Solar story content, sources, raw data, generated outputs |
| `src/datafarm-bikeshare/` | Bikeshare story content, sources, raw data, generated outputs |
| `public/wasm/` | PDL and Algraf WASM artifacts loaded by the app |
| `.github/workflows/studio-pages.yml` | GitHub Pages deployment |
| `docs/` | Studio spec and versioned release plans |

Static runtime WASM files are served from `public/wasm/`. Do not import assets
from `public/` in TypeScript; load them through the public base path helper.

## Building and running

Run commands from the Studio repository root.

Start the dev server:

```bash
npm run dev
```

Type-check:

```bash
npm run check
```

Download production WASM assets from the latest PDL and Algraf releases:

```bash
npm run build:wasm
```

Copy locally built sibling WASM artifacts from `../pdl` and `../algraf`:

```bash
npm run copy:wasm
```

Build the production app:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

`npm run build` downloads WASM, type-checks, and builds `dist/`. It may require
network access. Use `npm run copy:wasm` when validating coordinated local PDL or
Algraf changes.

## Required checks before finishing any change

For documentation-only changes, inspect formatting and run no code checks unless
the docs changed commands, paths, or examples that need verification.

For TypeScript, story metadata, runtime adapter, UI, or asset path changes, run:

```bash
npm run check
```

For runtime loading, deployment configuration, story bundle routing, WASM asset
paths, or release packaging changes, also run:

```bash
npm run build
```

For visible UI/runtime changes, manually verify the app in a browser. Confirm:

- PDL and Algraf runtime pills reach ready state.
- PDL outputs populate the prepared CSV panel.
- Prepared CSV files are available to Algraf charts.
- Charts render for both stories.
- Runtime and language diagnostics appear in the relevant editors.
- Switching stories clears snapshots without losing per-story source edits.

There is no dedicated automated test runner yet. Do not claim test coverage that
does not exist.

## Versioning

The current Studio package version is `0.13.0`.

When implementing a numbered plan, update every version stamp that tracks Studio
itself:

- `package.json`;
- `package-lock.json`;
- `docs/STUDIO_SPEC.md`;
- any future Studio package manifests, generated docs, or user-facing release
  strings.

Do not mark a plan shipped while leaving version stamps on the previous release.

PDL and Algraf versions are separate. When updating consumed WASM behavior,
record whether the build uses:

- latest GitHub Release assets via `npm run build:wasm`;
- local sibling artifacts via `npm run copy:wasm`;
- a pinned future release.

## Story assets

Story assets are checked in under `src/datafarm-solar/` and
`src/datafarm-bikeshare/`.

Each story has:

- `STORY.md`;
- root `story.pdl`;
- numbered section folders;
- `.pdl` section sources;
- `.ag` chart sources;
- checked-in CSV outputs;
- raw data under `data/`.

If you touch story files, keep all of these aligned:

- visible PDL and Algraf source;
- root `story.pdl`;
- section `programPath`;
- section `outputName`;
- section `dataFile`;
- supporting files and supporting outputs;
- `src/storyBundles.ts`;
- bundled raw file names;
- checked-in generated CSVs when they are intentionally part of the story.

Prefer kebab-case for story source filenames and snake_case for generated CSV
filenames.

## Runtime and editor adapters

`src/pdlRuntime.ts` and `src/algrafRuntime.ts` are ABI adapters. Keep them small
and explicit.

Practical rules:

- Validate required WASM exports before exposing a runtime.
- Keep JSON payload shapes aligned with the upstream runtime ABIs.
- Deallocate WASM buffers on success and failure.
- Do not swallow runtime errors silently.
- Do not add TypeScript language semantics that belong in PDL or Algraf.
- Update `docs/STUDIO_SPEC.md` when adapter contracts change.

`src/pdlEditorProviders.ts` and `src/algrafEditorProviders.ts` adapt upstream
editor-service responses into Monaco providers. Improve language intelligence in
the upstream editor-service crates whenever possible.

The TextMate grammars in `src/grammars/` are local static copies. If upstream
PDL or Algraf grammar changes affect highlighting, update these copies in the
same Studio change that consumes the new language surface.

## Coding style and naming

Use TypeScript, React function components, and existing module patterns.

Keep component names PascalCase, helpers and variables camelCase, story section
files kebab-case, and generated CSV files snake_case.

Prefer explicit typed interfaces for story, runtime, editor-service, and
workflow payloads.

Keep imports relative to `src/` unless the project establishes an alias.

Do not mix broad UI redesigns with runtime or story data changes unless the plan
explicitly scopes them together.

## Commit and pull request guidance

Recent commits use short imperative lowercase messages, such as
`fix relative paths for story bundles` and `change virtual path names`.

Keep commits focused. Avoid mixing generated artifacts with source edits unless
the generated artifacts are required to keep a story or release reproducible.

Pull requests should include:

- user-visible change summary;
- active plan item or new plan file;
- spec sections updated;
- checks run;
- browser/manual verification notes for visible changes;
- PDL/Algraf WASM release or local-build assumptions;
- screenshots or short recordings for Studio UI changes.

## Agent-specific instructions

Always inspect `git status --short` before editing.

Never revert unrelated user changes.

Before finishing, inspect `git status --short` again and report untracked local
artifacts.

If work touches source behavior, make sure spec, active plan, code, and checks
are aligned before stopping.

## Commits

Do not create git commits. Make file edits, run the required validation
checks, and stop. Every commit must be authored manually by a human
author after they review the working tree. Stage and commit only when
explicitly asked to do so for a specific commit, and never as part of
finishing a task or closing out a multi-step plan.
