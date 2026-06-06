import React from "react";
import type { AlgrafDiagnostic, AlgrafRenderResult, AlgrafRuntime } from "algraf-wasm";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/min/vs/editor/editor.main.css";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { AlertCircle, BarChart3, CheckCircle2, Rows3, SlidersHorizontal, Table2 } from "lucide-react";
import { PdlEditor } from "pdl-editor";
import type { PdlContextValue, PdlEditorDiagnostic, PdlEditorServiceResult, PdlRunResult, PdlRuntime } from "pdl-wasm";

import { AlgrafEditor } from "../AlgrafEditor";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import type { RuntimeState } from "../studioTypes";
import {
  countDataRows,
  diagnosticsForAlgrafEditor,
  errorMessage,
  selectSavedCsvArtifact,
  type SavedCsvArtifact,
} from "../studioUtils";

const SIMPLE_SERIES_PATH = "simple_series.csv";
const SIMPLE_PDL_PATH = "memory/how-built/simple-slider.pdl";
const SIMPLE_OUTPUT_PATH = "visible_days.csv";
const REACT_SNIPPET_LANGUAGE_ID = "datafarm-react-tsx";

const SIMPLE_SERIES_CSV = `day,value
1,18
2,34
3,48
4,61
5,73
6,88
`;

const SIMPLE_PDL_SOURCE = `param visible_days = 4

output visible_days =
  load "simple_series.csv"
  | filter day <= $visible_days
  | select day, value
  | save "visible_days.csv"
`;

const SIMPLE_ALGRAF_SOURCE = `Chart(
    data: "visible_days.csv",
    width: 520,
    height: 230,
    title: "Slider controls the prepared table"
) {
    Theme(name: "minimal")
    Scale(fill: value, gradient: ["#d8f3dc", "#145f52"], label: "Value")
    Scale(axis: x, type: "categorical")
    Scale(axis: y, domain: [0, 100], breaks: [0, 25, 50, 75, 100])
    Guide(axis: x, label: "Day")
    Guide(axis: y, label: "Value")

    Space(day * value) {
        Bar(fill: value, layout: "stack", tooltip: [day, value])
        On(event: "click", emit: day)
        Text(label: value, dy: -8, anchor: "middle", size: 10)
    }
}
`;

const BUILD_IMPORTS_SOURCE = `import React from "react";
import { loadPdlRuntime, type PdlRuntime } from "pdl-wasm";
import { loadAlgrafRuntime, type AlgrafRuntime } from "algraf-wasm";

import { PdlEditor } from "pdl-editor";
import { AlgrafEditor } from "algraf-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import onigasmWasmUrl from "onigasm/lib/onigasm.wasm?url";
import { publicAssetUrl } from "./publicAssets";

loadPdlRuntime({ wasmUrl: publicAssetUrl("wasm/pdl.wasm") });
loadAlgrafRuntime({ wasmUrl: publicAssetUrl("wasm/algraf.wasm") });

const algrafSetupOptions = {
  createEditorWorker: () => new EditorWorker(),
  onigasmWasmUrl,
};`;

const BUILD_STATE_SOURCE = `const [visibleDays, setVisibleDays] = React.useState(4);

<input
  type="range"
  min={1}
  max={6}
  value={visibleDays}
  onChange={(event) => {
    setVisibleDays(Number(event.currentTarget.value));
  }}
/>;`;

const BUILD_EVENT_SOURCE = `<div
  className="chart-host"
  dangerouslySetInnerHTML={{ __html: chart.svg }}
  onClick={(event) => {
    const mark =
      event.target instanceof Element
        ? event.target.closest("[data-algraf-event][data-algraf-emit-field][data-algraf-emit-value]")
        : null;

    if (
      mark?.getAttribute("data-algraf-event") === "click" &&
      mark.getAttribute("data-algraf-emit-field") === "day"
    ) {
      const day = Number(mark.getAttribute("data-algraf-emit-value"));
      if (Number.isFinite(day)) setVisibleDays(day);
    }
  }}
/>;`;

const BUILD_RUN_SOURCE = `const files = { "simple_series.csv": SIMPLE_SERIES_CSV };

const pdlDiagnostics = pdlRuntime.editorService(
  pdlSource,
  files,
  { kind: "diagnostics" },
  SIMPLE_PDL_PATH,
);

const pdlResult = pdlRuntime.run(pdlSource, files, {
  context: { visible_days: visibleDays },
  programPath: SIMPLE_PDL_PATH,
});

const runtimeFiles = { ...files, ...pdlResult.files };
const chart = algrafRuntime.render(algrafSource, runtimeFiles);`;

const BUILD_EDITOR_SOURCE = `<PdlEditor
  value={pdlSource}
  onChange={setPdlSource}
  runtime={pdlRuntime}
  files={{ "simple_series.csv": SIMPLE_SERIES_CSV }}
  diagnostics={pdlDiagnostics.diagnostics}
/>

<AlgrafEditor
  value={algrafSource}
  onChange={setAlgrafSource}
  runtime={algrafRuntime}
  files={runtimeFiles}
  diagnostics={chart.diagnostics}
  setupOptions={algrafSetupOptions}
/>`;

const BUILD_VIEW_SOURCE = `<div
  className="chart-host"
  dangerouslySetInnerHTML={{ __html: chart.svg }}
/>

<pre>{pdlResult.files["visible_days.csv"]}</pre>`;

const READ_ONLY_LANGUAGE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  contextmenu: false,
  domReadOnly: true,
  readOnly: true,
  renderLineHighlight: "none",
  scrollbar: {
    alwaysConsumeMouseWheel: false,
    horizontalScrollbarSize: 8,
    verticalScrollbarSize: 8,
  },
  wordWrap: "on",
};

const COMPACT_LANGUAGE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  ...READ_ONLY_LANGUAGE_OPTIONS,
  domReadOnly: false,
  fontSize: 11,
  lineHeight: 15,
  minimap: { enabled: false },
  padding: { top: 8, bottom: 8 },
  readOnly: false,
  scrollBeyondLastLine: false,
};

interface HowBuiltPageProps {
  algrafRuntime: AlgrafRuntime | null;
  algrafState: RuntimeState;
  pdlRuntime: PdlRuntime | null;
  pdlState: RuntimeState;
  runtimeError: string | null;
}

interface BuildExampleSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  runtimeFiles: Record<string, string>;
  preparedArtifact: SavedCsvArtifact | null;
  error: string | null;
}

interface BuildStep {
  id: string;
  label: string;
  title: string;
  body: string[];
  source: string;
  height: number;
}

const BUILD_STEPS: BuildStep[] = [
  {
    id: "imports",
    label: "Imports",
    title: "Import runtimes separately from editor components",
    body: [
      "`pdl-wasm` and `algraf-wasm` load the browser runtimes and expose the calls used for preparation and rendering.",
      "`pdl-editor` and `algraf-editor` provide Monaco-backed editors with language highlighting and diagnostics already attached.",
    ],
    source: BUILD_IMPORTS_SOURCE,
    height: 240,
  },
  {
    id: "state",
    label: "State",
    title: "Use one React state value and one direct slider event",
    body: [
      "The control has one React value: `visibleDays`. The slider's `onChange` handler writes the number directly.",
      "That number is the only value that crosses into PDL as runtime context. The editable source strings are controlled editor values, so there is no separate UI store hidden in PDL or Algraf.",
    ],
    source: BUILD_STATE_SOURCE,
    height: 220,
  },
  {
    id: "run-boundary",
    label: "Runtime",
    title: "Run PDL, merge files, then render Algraf",
    body: [
      "`editorService` asks PDL for editor diagnostics. `run` executes the PDL program with the slider value as context. The saved file map then becomes Algraf's input.",
      "The handoff is simple: PDL receives source and files, then returns files. Algraf receives source and files, then returns SVG.",
    ],
    source: BUILD_RUN_SOURCE,
    height: 360,
  },
  {
    id: "events",
    label: "Events",
    title: "Handle Algraf clicks directly in React",
    body: [
      "The chart click handler is an `onClick` on the rendered SVG host.",
      "The handler reads Algraf's emitted field and value from the clicked mark. If the mark emitted `day`, React writes that number back to `visibleDays`, so the chart and slider both control the same state.",
    ],
    source: BUILD_EVENT_SOURCE,
    height: 360,
  },
  {
    id: "editors",
    label: "Editors",
    title: "Render the language editors as controlled React components",
    body: [
      "The editor components are normal React inputs over host-owned strings. The live PDL and Algraf editors above are editable, so each keystroke updates the same source string the runtimes consume.",
      "The host passes `value`, `runtime`, `files`, diagnostics, and Algraf's worker and Onigasm setup assets. The editor packages handle Monaco registration and language services.",
    ],
    source: BUILD_EDITOR_SOURCE,
    height: 300,
  },
  {
    id: "view",
    label: "View",
    title: "Render only the returned SVG and saved CSV",
    body: [
      "The visible chart is just the SVG returned by Algraf. The visible table is just the CSV returned by PDL.",
      "Changing the slider repeats the same loop: React state changes, PDL reruns with one param, Algraf redraws from PDL's saved file.",
    ],
    source: BUILD_VIEW_SOURCE,
    height: 220,
  },
];

export function HowBuiltPage({
  algrafRuntime,
  algrafState,
  pdlRuntime,
  pdlState,
  runtimeError,
}: HowBuiltPageProps): React.ReactElement {
  const [visibleDays, setVisibleDays] = React.useState(4);
  const [pdlSource, setPdlSource] = React.useState(SIMPLE_PDL_SOURCE);
  const [algrafSource, setAlgrafSource] = React.useState(SIMPLE_ALGRAF_SOURCE);
  const [lastClickedDay, setLastClickedDay] = React.useState<number | null>(null);
  const runtimeReady = pdlState === "ready" && algrafState === "ready" && pdlRuntime != null && algrafRuntime != null;
  const snapshot = runtimeReady ? runBuildExample(pdlRuntime, algrafRuntime, visibleDays, pdlSource, algrafSource) : emptyBuildExampleSnapshot();
  const outputArtifact = snapshot.preparedArtifact;
  const outputPath = outputArtifact?.path ?? SIMPLE_OUTPUT_PATH;
  const outputCsv = outputArtifact?.csv ?? "";
  const diagnosticsCount =
    snapshot.pdlDiagnostics.length +
    (snapshot.pdlResult?.diagnostics.length ?? 0) +
    snapshot.algrafDiagnostics.length +
    (snapshot.error || runtimeError ? 1 : 0);

  return (
    <div className="build-page">
      <section className="build-hero">
        <div className="build-hero-copy">
          <p className="eyebrow">How Built</p>
          <h1>A slider controls a prepared chart</h1>
          <p>
            This walkthrough shows the smallest useful pattern: React stores one value, PDL uses it as
            `visible_days`, PDL saves a CSV, and Algraf redraws the chart from that file.
          </p>
          <p>
            The source panels below show the imports, runtime calls, editor components, event handler, and rendered
            output used by the live example.
          </p>
        </div>
      </section>

      <section className="build-demo-shell" aria-label="Live one slider example">
        <div className="build-demo-grid">
          <div className="build-demo-data-rail">
            <article className="control-panel build-demo-control">
          <div className="panel-header">
            <span>
              <SlidersHorizontal size={16} aria-hidden="true" />
              Slider state
            </span>
            <small>{runtimeReady ? "ready" : "loading"}</small>
          </div>
          <label className="control-field">
            <span>Visible days</span>
            <strong>{visibleDays}</strong>
            <input
              min={1}
              max={6}
              onChange={(event) => {
                const nextValue = Number(event.currentTarget.value);
                setVisibleDays(nextValue);
                setLastClickedDay(null);
              }}
              type="range"
              value={visibleDays}
            />
          </label>
          <p className="build-control-note">
            {lastClickedDay == null ? "Move the slider or click a bar in the chart." : `Chart click set visibleDays to ${lastClickedDay}.`}
          </p>
            </article>

            <article className="result-panel build-demo-input-panel">
          <div className="panel-header">
            <span>
              <Table2 size={16} aria-hidden="true" />
              {SIMPLE_SERIES_PATH}
            </span>
            <small>{countDataRows(SIMPLE_SERIES_CSV)} rows</small>
          </div>
              <pre className="output-block build-output-block build-output-block-input">{SIMPLE_SERIES_CSV}</pre>
            </article>

            <article className="result-panel build-demo-output-panel">
              <div className="panel-header">
                <span>
                  <Rows3 size={16} aria-hidden="true" />
                  {outputPath}
                </span>
                <small>{countDataRows(outputCsv)} rows</small>
              </div>
              <pre className="output-block build-output-block">{outputCsv || "Waiting for generated output..."}</pre>
            </article>
          </div>

        <article className="result-panel build-demo-chart-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              Rendered chart
            </span>
            <small>Algraf SVG</small>
          </div>
          <div className="chart-stage build-demo-chart-stage">
            {snapshot.algrafResult?.svg ? (
              <div
                className="chart-host interactive-chart-host"
                dangerouslySetInnerHTML={{ __html: snapshot.algrafResult.svg }}
                onClick={(event) => {
                  const mark =
                    event.target instanceof Element
                      ? event.target.closest("[data-algraf-event][data-algraf-emit-field][data-algraf-emit-value]")
                      : null;

                  if (
                    mark?.getAttribute("data-algraf-event") === "click" &&
                    mark.getAttribute("data-algraf-emit-field") === "day"
                  ) {
                    const clickedDay = Number(mark.getAttribute("data-algraf-emit-value"));
                    if (Number.isFinite(clickedDay)) {
                      setVisibleDays(clickedDay);
                      setLastClickedDay(clickedDay);
                    }
                  }
                }}
              />
            ) : (
              <div className="empty-chart">
                <AlertCircle size={22} aria-hidden="true" />
                {snapshot.error ?? runtimeError ?? "Waiting for PDL and Algraf"}
              </div>
            )}
          </div>
        </article>

        <div className="build-demo-source-rail" aria-label="PDL and Algraf source code">
          <article className="editor-panel build-demo-source-panel build-demo-source-panel-pdl">
            <div className="panel-header">
              <span>
                <Table2 size={16} aria-hidden="true" />
                simple-slider.pdl
              </span>
              <small>PDL</small>
            </div>
            <div className="build-demo-source-editor build-demo-source-editor-pdl">
              <PdlEditor
                diagnostics={snapshot.pdlDiagnostics}
                files={{ [SIMPLE_SERIES_PATH]: SIMPLE_SERIES_CSV }}
                modelUri="inmemory://datafarm/how-built/live-simple-slider.pdl"
                onChange={setPdlSource}
                options={COMPACT_LANGUAGE_OPTIONS}
                runtime={pdlRuntime}
                theme={DATAFARM_EDITOR_THEME}
                themeName={DATAFARM_EDITOR_THEME_NAME}
                value={pdlSource}
              />
            </div>
          </article>

          <article className="editor-panel build-demo-source-panel build-demo-source-panel-ag">
            <div className="panel-header">
              <span>
                <BarChart3 size={16} aria-hidden="true" />
                simple-slider.ag
              </span>
              <small>Algraf</small>
            </div>
            <div className="build-demo-source-editor build-demo-source-editor-ag">
              <AlgrafEditor
                diagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
                files={snapshot.runtimeFiles}
                modelUri="inmemory://datafarm/how-built/live-simple-slider.ag"
                onChange={setAlgrafSource}
                options={COMPACT_LANGUAGE_OPTIONS}
                runtime={algrafRuntime}
                theme={DATAFARM_EDITOR_THEME}
                themeName={DATAFARM_EDITOR_THEME_NAME}
                value={algrafSource}
              />
            </div>
          </article>
        </div>

        </div>
      </section>

      <section className={`demo-diagnostics ${snapshot.error || runtimeError ? "demo-diagnostics-error" : ""}`} aria-live="polite">
        {snapshot.error || runtimeError ? (
          <>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{snapshot.error ?? runtimeError}</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Slider value, PDL output, and Algraf chart match.</span>
          </>
        )}
      </section>

      <section className="build-flow-list" aria-label="Direct wiring source walkthrough">
        {BUILD_STEPS.map((item, index) => (
          <article className="build-flow-card" key={item.id}>
            <div className="build-flow-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="build-flow-body">
              <div className="build-flow-kicker">{item.label}</div>
              <h2>{item.title}</h2>
              <div className="build-step-copy">
                {item.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <ReadOnlyReactSourceEditor height={item.height} modelId={item.id} value={item.source} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

let snippetMonacoReady = false;

const REACT_SNIPPET_TOKENS: monaco.languages.IMonarchLanguage = {
  defaultToken: "identifier",
  keywords: [
    "as",
    "const",
    "else",
    "false",
    "from",
    "function",
    "if",
    "import",
    "instanceof",
    "let",
    "null",
    "return",
    "satisfies",
    "true",
    "type",
  ],
  tokenizer: {
    root: [
      [/\/\/.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, "string", "@stringDouble"],
      [/'([^'\\]|\\.)*$/, "string.invalid"],
      [/'/, "string", "@stringSingle"],
      [/`/, "string", "@stringTemplate"],
      [/[0-9]+(?:\.[0-9]+)?/, "number"],
      [/[{}()[\]]/, "@brackets"],
      [/[<>]/, "delimiter.angle"],
      [/[=><!~?:&|+\-*/^%]+/, "operator"],
      [/[a-zA-Z_$][\w$]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/[;,.]/, "delimiter"],
      [/\s+/, "white"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
    stringDouble: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],
    stringSingle: [
      [/[^\\']+/, "string"],
      [/\\./, "string.escape"],
      [/'/, "string", "@pop"],
    ],
    stringTemplate: [
      [/[^\\`$]+/, "string"],
      [/\\./, "string.escape"],
      [/\$\{/, { token: "delimiter.bracket", next: "@root" }],
      [/`/, "string", "@pop"],
    ],
  },
};

function ReadOnlyReactSourceEditor({
  modelId,
  value,
  height,
}: {
  modelId: string;
  value: string;
  height: number;
}): React.ReactElement {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = React.useRef<monaco.editor.ITextModel | null>(null);
  const modelUri = React.useMemo(() => monaco.Uri.parse(`inmemory://datafarm/how-built/${modelId}.tsx`), [modelId]);

  React.useEffect(() => {
    const model = modelRef.current;
    if (model && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [value]);

  React.useEffect(() => {
    let cancelled = false;
    let editor: monaco.editor.IStandaloneCodeEditor | null = null;
    let model: monaco.editor.ITextModel | null = null;

    setupSnippetMonaco();

    const timer = window.setTimeout(() => {
      if (cancelled || !hostRef.current) {
        return;
      }

      model = monaco.editor.getModel(modelUri) ?? monaco.editor.createModel(value, REACT_SNIPPET_LANGUAGE_ID, modelUri);
      if (model.getValue() !== value) {
        model.setValue(value);
      }

      editor = monaco.editor.create(hostRef.current, {
        model,
        theme: DATAFARM_EDITOR_THEME_NAME,
        automaticLayout: true,
        contextmenu: false,
        domReadOnly: true,
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
        fontSize: 12,
        lineDecorationsWidth: 10,
        lineHeight: 19,
        lineNumbers: "on",
        minimap: { enabled: false },
        overviewRulerBorder: false,
        padding: { top: 12, bottom: 12 },
        readOnly: true,
        renderLineHighlight: "none",
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          horizontalScrollbarSize: 8,
          verticalScrollbarSize: 8,
        },
        scrollBeyondLastLine: false,
        tabSize: 2,
        wordWrap: "on",
      });

      modelRef.current = model;
      editorRef.current = editor;
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      editor?.dispose();
      model?.dispose();
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
      if (modelRef.current === model) {
        modelRef.current = null;
      }
    };
  }, [modelUri, value]);

  return <div aria-label="React TSX source editor" className="build-code-editor" ref={hostRef} style={{ height }} />;
}

function setupSnippetMonaco(): void {
  const target = globalThis as typeof globalThis & {
    MonacoEnvironment?: monaco.Environment;
  };

  if (snippetMonacoReady) {
    return;
  }

  target.MonacoEnvironment ??= {
    getWorker: () => new EditorWorker(),
  };

  monaco.editor.defineTheme(DATAFARM_EDITOR_THEME_NAME, DATAFARM_EDITOR_THEME);
  if (!monaco.languages.getLanguages().some((language) => language.id === REACT_SNIPPET_LANGUAGE_ID)) {
    monaco.languages.register({
      id: REACT_SNIPPET_LANGUAGE_ID,
      aliases: ["React TSX snippet"],
      extensions: [".tsx"],
    });
    monaco.languages.setMonarchTokensProvider(REACT_SNIPPET_LANGUAGE_ID, REACT_SNIPPET_TOKENS);
    monaco.languages.setLanguageConfiguration(REACT_SNIPPET_LANGUAGE_ID, {
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "<", close: ">" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: "`", close: "`" },
      ],
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
        ["<", ">"],
      ],
      comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
      },
    });
  }

  snippetMonacoReady = true;
}

function runBuildExample(
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  visibleDays: number,
  pdlSource: string,
  algrafSource: string,
): BuildExampleSnapshot {
  const files: Record<string, string> = { [SIMPLE_SERIES_PATH]: SIMPLE_SERIES_CSV };

  try {
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      files,
      { kind: "diagnostics" },
      SIMPLE_PDL_PATH,
    );
    const pdlResult = pdlRuntime.run(pdlSource, files, {
      context: { visible_days: visibleDays } satisfies Record<string, PdlContextValue>,
      programPath: SIMPLE_PDL_PATH,
    });
    const runtimeFiles: Record<string, string> = {
      ...files,
      ...(pdlResult.files ?? {}),
    };
    const preparedArtifact = selectSavedCsvArtifact(pdlResult.files, SIMPLE_OUTPUT_PATH);
    const algrafResult = preparedArtifact ? algrafRuntime.render(algrafSource, runtimeFiles) : null;

    return {
      pdlResult,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      runtimeFiles,
      preparedArtifact,
      error: pdlEditorResponse.error ?? pdlResult.error ?? algrafResult?.error ?? null,
    };
  } catch (error: unknown) {
    return {
      ...emptyBuildExampleSnapshot(),
      error: errorMessage(error),
    };
  }
}

function emptyBuildExampleSnapshot(): BuildExampleSnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    algrafResult: null,
    algrafDiagnostics: [],
    runtimeFiles: { [SIMPLE_SERIES_PATH]: SIMPLE_SERIES_CSV },
    preparedArtifact: null,
    error: null,
  };
}
