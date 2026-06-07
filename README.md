# Datafarm Studio

Datafarm Studio is the browser workspace for Datafarm's data-story workflow. It
ships as a Vite/React app with a landing page, a free-form IDE, two editable
case studies (Solar and Bikeshare), documentation pages including a "How Built"
walkthrough, and an interactivity lab. Each case study exposes raw data, PDL
preparation code, Algraf chart code, prepared CSV output, and the rendered
chart in one page.

## A tour in five panels

Studio is organized around the same repeated analytical unit: raw data flows
through PDL into a prepared CSV, Algraf renders it as a chart, and narrative
wraps the result. The snippets below are a deliberately tiny version of that
loop — the actual landing page runs the same pipeline live in the browser.

## 1. Raw data

Raw CSV (and GeoJSON, etc.) files are bundled into the app and opened in
Monaco editors. Edits stay in browser memory and feed the runtime file map
used by PDL and Algraf.

```csv
day,value
1,18
2,34
3,48
4,61
```

## 2. PDL preparation

A `.pdl` file declares the transform. It loads the source by filename, applies
ordered stages, and saves a named output that the chart will read.

```pdl
output sorted_days =
  load "day_value.csv"
  | select day, value
  | sort value desc
  | save "sorted_days.csv"
```

## 3. Prepared output

PDL runs in the browser through `public/wasm/pdl.wasm` and returns the saved
table. Studio displays it as CSV and also exposes it to Algraf through the
runtime file map under the name the chart expects.

```csv
day,value
4,61
3,48
2,34
1,18
```

Studio consumes the published `pdl-wasm@0.39.0` and `pdl-editor@0.39.0` npm
packages. Runtime WASM loads from `public/wasm/pdl.wasm`, populated by the
installed `pdl-wasm` package during ordinary dev/build runs or by
`npm run copy:wasm` for coordinated local runtime validation.

## 4. Algraf chart

A `.ag` file declares the chart. It points at the prepared CSV, declares the
algebraic frame, picks scales, and draws one or more geometries. Algraf runs
in the browser through `public/wasm/algraf.wasm` and returns deterministic
SVG.

```algraf
Chart(data: "sorted_days.csv", width: 520, height: 240) {
    Scale(fill: value, gradient: ["#d8f3dc", "#145f52"], label: "Value")
    Scale(axis: x, type: "categorical")

    Space(day * value) {
        Bar(fill: value, tooltip: [day, value])
    }
}
```

Studio consumes the published `algraf-wasm@0.68.5` and
`algraf-editor@0.68.5` npm packages. Runtime WASM loads from
`public/wasm/algraf.wasm`, populated by the installed `algraf-wasm` package
during ordinary dev/build runs. Use `npm run copy:wasm` after building sibling
WASM artifacts only when coordinated local runtime validation needs local
`../algraf` or `../pdl` WASM files.

## 5. Story evidence

Studio wraps the run in narrative prose so the chart reads as a claim rather
than just an image. Each section has a short headline, supporting evidence,
and a conclusion that ties back to the data the user can edit above.

```markdown
# Sorted days

After ranking each day by value, the busiest days cluster at the end of the
window. The prepared CSV makes the ordering auditable, and the chart shows
the gap between top and bottom days at a glance.
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

## Native CLI companions

The `.pdl` and `.ag` files Studio edits are the same source files consumed by
the standalone PDL and Algraf Rust binaries. The CLI side adds a Polars 0.53
native execution engine, Arrow IPC streaming on stdin/stdout, additional
formats (Parquet, JSON Lines, Arrow file/stream, SQLite, GeoJSON), and Unix
pipeline composition with the rest of your toolbox.

Install both binaries with Homebrew:

```bash
brew tap williamcotton/pdl && brew install williamcotton/pdl/pdl
brew tap williamcotton/algraf && brew install williamcotton/algraf/algraf
```

Then a Studio pipeline can run end to end natively, no intermediate files:

```bash
pdl run prep.pdl --stdout-format arrow-stream \
  | algraf render chart.ag --data - --data-format arrow-stream \
  --output chart.svg
```

See [`williamcotton/pdl`](https://github.com/williamcotton/pdl) and
[`williamcotton/algraf`](https://github.com/williamcotton/algraf) for the full
CLI, LSP, and editor surfaces.
