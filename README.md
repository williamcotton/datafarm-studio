# Datafarm Studio

Datafarm Studio is the browser workspace for Datafarm's data-story workflow. It
currently ships as a Vite/React app with two editable case studies: Solar and
Bikeshare. Each case study exposes raw data, PDL preparation code, Algraf chart
code, prepared CSV output, and the rendered chart in one page.

The long-term project direction is a data science IDE for building, running,
debugging, visualizing, and publishing Datafarm projects. The current case
studies are the first marketing and workflow slice of that IDE: they prove the
PDL -> Algraf browser runtime path and provide realistic stories to preserve as
the product surface grows.

The normative reference is [`docs/STUDIO_SPEC.md`](docs/STUDIO_SPEC.md).
Versioned work plans live in [`docs/`](docs/) as `V0_<minor>_PLAN.md` files.

## A tour in five panels

The shipped application is organized around the same repeated analytical unit in
each story.

## 1. Raw data

Raw CSV and GeoJSON files are bundled into the app and opened in Monaco editors.
Edits stay in browser memory and feed the runtime file map used by PDL and
Algraf.

Solar includes state capacity, seasonal generation, and a county basemap.
Bikeshare includes raw trips, station metadata, and daily weather.

## 2. PDL preparation

Each section has a `.pdl` file that prepares the smallest table needed by that
section. The default run uses a story-level PDL program with named outputs; when
a user edits any per-section PDL source, Studio switches to running each section
program independently so local edits are reflected immediately.

## 3. Prepared output

PDL runs in the browser through `public/wasm/pdl.wasm`. Studio displays the CSV
produced for the active section and also passes that CSV to Algraf as both
`prepared.csv` and the section's expected data filename.

Studio v0.2 expects PDL v0.26-compatible syntax and WASM: bare/backtick column
references, double-quoted strings and paths, and assignment-form aggregate and
projection stages.

## 4. Algraf chart

Each section has a `.ag` file backed by Algraf editor services and runtime
rendering. Algraf runs in the browser through `public/wasm/algraf.wasm`, reads
the in-memory files supplied by Studio, and returns deterministic SVG.

## 5. Story evidence

The current UI wraps every run in narrative evidence, conclusions, headline
metrics, and story navigation. This area is product content, not the core IDE.
Future IDE work should preserve it as a marketing/publishing surface while
building project, file, execution, data, and preview tools around the same
runtime contracts.

## Run locally

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Type-check:

```bash
npm run check
```

Build with production WASM assets from the latest PDL and Algraf releases:

```bash
npm run build
```

Use locally built sibling WASM artifacts when coordinating with `../pdl` or
`../algraf`:

```bash
npm run copy:wasm
npm run check
npm run dev
```

## Runtime model

Studio is a browser host for the PDL and Algraf WASM ABIs. It does not implement
PDL parsing, PDL execution, Algraf parsing, Algraf analysis, or Algraf rendering
in TypeScript.

The host is responsible for:

- loading WASM files from the Vite public base path;
- maintaining editable in-memory source and data files;
- calling PDL and Algraf JSON ABIs;
- adapting diagnostics and editor-service responses into Monaco;
- passing prepared PDL outputs into Algraf file maps;
- rendering returned SVG in the browser.

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | Main Studio shell, story switching, workflow execution, panels |
| `src/storyBundles.ts` | Solar and Bikeshare story metadata, default source maps, raw files |
| `src/PdlEditor.tsx` | Monaco editor host for PDL |
| `src/pdlEditorProviders.ts` | Monaco provider adapters backed by PDL editor services |
| `src/pdlRuntime.ts` | Browser loader and JSON ABI wrapper for `pdl.wasm` |
| `src/AlgrafEditor.tsx` | Monaco editor host for Algraf |
| `src/algrafEditorProviders.ts` | Monaco provider adapters backed by Algraf editor services |
| `src/algrafRuntime.ts` | Browser loader and JSON ABI wrapper for `algraf.wasm` |
| `src/DataEditor.tsx` | Monaco editor host for bundled data files |
| `src/datafarm-solar/` | Solar case-study source, data, section outputs, story program |
| `src/datafarm-bikeshare/` | Bikeshare case-study source, data, section outputs, story program |
| `public/wasm/` | Browser WASM artifacts loaded at runtime |
| `docs/` | Studio specification and versioned work plans |

## Release discipline

Behavioral changes should update the active `docs/V0_<minor>_PLAN.md`, the
relevant section of `docs/STUDIO_SPEC.md`, implementation code, and validation
commands together. If a change depends on new PDL or Algraf runtime behavior,
document the producer version or local-build assumption in the plan and pull
request.
