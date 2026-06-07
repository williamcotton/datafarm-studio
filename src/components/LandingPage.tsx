import React from "react";
import type { AlgrafDiagnostic, AlgrafRenderResult, AlgrafRuntime } from "algraf-wasm";
import { AlertCircle, BarChart3, BookOpenText, CheckCircle2, Database, FlaskConical, FolderKanban, Rows3, Table2, Terminal, Workflow } from "lucide-react";
import type { PdlEditorDiagnostic, PdlEditorServiceResult, PdlRunResult, PdlRuntime } from "pdl-wasm";

import { DataPanel } from "./DataPanel";
import { RouteLink } from "./RouteLink";
import { AlgrafEditor } from "../AlgrafEditor";
import { PdlEditor } from "../PdlEditor";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import type { RuntimeState } from "../studioTypes";
import { countDataRows, diagnosticsForAlgrafEditor, errorMessage, selectSavedCsvArtifact, type SavedCsvArtifact } from "../studioUtils";

const LANDING_DATA_PATH = "day_value.csv";
const LANDING_PDL_PATH = "memory/landing/sort-days.pdl";
const LANDING_OUTPUT_PATH = "sorted_days.csv";

const DEFAULT_LANDING_DATA = `day,value
1,18
2,34
3,48
4,61`;

const DEFAULT_LANDING_PDL_SOURCE = `output sorted_days =
  load "day_value.csv"
  | select day, value
  | sort value desc
  | save "sorted_days.csv"
`;

const DEFAULT_LANDING_ALGRAF_SOURCE = `Chart(
    data: "sorted_days.csv",
    width: 520,
    height: 240,
) {
    Scale(fill: value, gradient: ["#d8f3dc", "#145f52"], label: "Value")
    Scale(axis: x, type: "categorical")

    Space(day * value) {
        Bar(fill: value, layout: "stack", tooltip: [day, value])
    }
}`;

interface LandingSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  runtimeFiles: Record<string, string>;
  preparedArtifact: SavedCsvArtifact | null;
  error: string | null;
}

export function LandingPage({
  algrafRuntime,
  algrafState,
  onNavigate,
  pdlRuntime,
  pdlState,
  runtimeError,
}: {
  algrafRuntime: AlgrafRuntime | null;
  algrafState: RuntimeState;
  onNavigate: (path: string) => void;
  pdlRuntime: PdlRuntime | null;
  pdlState: RuntimeState;
  runtimeError: string | null;
}): React.ReactElement {
  const [dataSource, setDataSource] = React.useState(DEFAULT_LANDING_DATA);
  const [pdlSource, setPdlSource] = React.useState(DEFAULT_LANDING_PDL_SOURCE);
  const [algrafSource, setAlgrafSource] = React.useState(DEFAULT_LANDING_ALGRAF_SOURCE);
  const runtimeReady = pdlState === "ready" && algrafState === "ready" && pdlRuntime != null && algrafRuntime != null;
  const snapshot = React.useMemo(() => {
    if (!runtimeReady) {
      return emptyLandingSnapshot(dataSource);
    }
    return runLandingDemo(pdlRuntime, algrafRuntime, dataSource, pdlSource, algrafSource);
  }, [algrafRuntime, algrafSource, dataSource, pdlRuntime, pdlSource, runtimeReady]);
  const outputArtifact = snapshot.preparedArtifact;
  const outputPath = outputArtifact?.path ?? LANDING_OUTPUT_PATH;
  const outputCsv = outputArtifact?.csv ?? "";
  const diagnostics = landingDiagnostics(snapshot, runtimeError);

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Datafarm Studio</p>
          <h1>Two languages. Two runtimes.</h1>
          <p>
            PDL prepares data. Algraf renders charts. Each is its own small language with its own parser,
            language server, and WASM runtime — the two editors below are driven by independent toolchains.
            The same .pdl and .ag files also build as native Rust CLIs that stream Arrow IPC between stages
            for fast pipelines on large data.
          </p>
          <div className="hero-actions">
            <RouteLink className="primary-button" onNavigate={onNavigate} to="/ide">
              <Workflow size={16} aria-hidden="true" />
              Open IDE
            </RouteLink>
            <RouteLink className="secondary-button" onNavigate={onNavigate} to="/case-studies">
              <FolderKanban size={16} aria-hidden="true" />
              View case studies
            </RouteLink>
          </div>
        </div>

        <section className="landing-demo-shell" aria-label="Live PDL to Algraf preview">
          <div className="landing-demo-header">
            <div>
              <p className="eyebrow">Live preview</p>
              <h2>CSV sorted by PDL, rendered by Algraf</h2>
            </div>
            <small>{runtimeReady ? "PDL and Algraf ready" : "Loading runtimes"}</small>
          </div>

          <div className="landing-demo-grid">
            <DataPanel
              className="landing-demo-panel landing-data-panel"
              icon={<Table2 size={16} aria-hidden="true" />}
              label={LANDING_DATA_PATH}
              language="csv"
              meta={`${countDataRows(dataSource)} rows`}
              modelUri="inmemory://datafarm/landing/day_value.csv"
              onChange={setDataSource}
              value={dataSource}
            />

            <article className="editor-panel landing-demo-panel landing-pdl-panel">
              <div className="panel-header">
                <span>
                  <Workflow size={16} aria-hidden="true" />
                  sort-days.pdl
                </span>
                <small>PDL</small>
              </div>
              <div className="editor-host landing-editor-host">
                <PdlEditor
                  diagnostics={snapshot.pdlDiagnostics}
                  files={{ [LANDING_DATA_PATH]: dataSource }}
                  modelUri="inmemory://datafarm/landing/sort-days.pdl"
                  onChange={setPdlSource}
                  runtime={pdlRuntime}
                  theme={DATAFARM_EDITOR_THEME}
                  themeName={DATAFARM_EDITOR_THEME_NAME}
                  value={pdlSource}
                />
              </div>
            </article>

            <article className="editor-panel landing-demo-panel landing-algraf-panel">
              <div className="panel-header">
                <span>
                  <BarChart3 size={16} aria-hidden="true" />
                  chart.ag
                </span>
                <small>Algraf</small>
              </div>
              <div className="editor-host landing-editor-host">
                <AlgrafEditor
                  diagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
                  files={snapshot.runtimeFiles}
                  modelUri="inmemory://datafarm/landing/chart.ag"
                  onChange={setAlgrafSource}
                  runtime={algrafRuntime}
                  theme={DATAFARM_EDITOR_THEME}
                  themeName={DATAFARM_EDITOR_THEME_NAME}
                  value={algrafSource}
                />
              </div>
            </article>

            <article className="result-panel landing-demo-panel landing-output-panel">
              <div className="panel-header">
                <span>
                  <Rows3 size={16} aria-hidden="true" />
                  {outputPath}
                </span>
                <small>{countDataRows(outputCsv)} rows</small>
              </div>
              <pre className="output-block landing-output-block">{outputCsv || runtimeError || "Waiting for PDL output..."}</pre>
            </article>

            <article className="result-panel landing-demo-panel landing-chart-panel">
              <div className="panel-header">
                <span>
                  <BarChart3 size={16} aria-hidden="true" />
                  Rendered SVG
                </span>
                <small>Algraf</small>
              </div>
              <div className="chart-stage landing-chart-stage">
                {snapshot.algrafResult?.svg ? (
                  <div className="chart-host" dangerouslySetInnerHTML={{ __html: snapshot.algrafResult.svg }} />
                ) : (
                  <div className="empty-chart">
                    <AlertCircle size={22} aria-hidden="true" />
                    {snapshot.error ?? runtimeError ?? "No chart rendered yet"}
                  </div>
                )}
              </div>
            </article>

            <div className={`landing-demo-status ${diagnostics.length > 0 ? "landing-demo-status-error" : ""}`} aria-live="polite">
              {diagnostics.length > 0 ? (
                <>
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{diagnostics[0]}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Edit the CSV, PDL, or Algraf source and the saved CSV and chart update together.</span>
                </>
              )}
            </div>
          </div>
        </section>
      </section>

      <section className="landing-section-grid" aria-label="Studio sections">
        <RouteLink className="landing-section-card" onNavigate={onNavigate} to="/ide">
          <Workflow size={18} aria-hidden="true" />
          <strong>IDE</strong>
          <span>Upload or edit data, prepare it with PDL or SQL, preview CSV output, and chart it with Algraf.</span>
        </RouteLink>
        <RouteLink className="landing-section-card" onNavigate={onNavigate} to="/case-studies">
          <BarChart3 size={18} aria-hidden="true" />
          <strong>Case Studies</strong>
          <span>Open complete Solar and Bikeshare workflows with editable data, code, charts, and conclusions.</span>
        </RouteLink>
        <RouteLink className="landing-section-card" onNavigate={onNavigate} to="/docs">
          <BookOpenText size={18} aria-hidden="true" />
          <strong>Docs</strong>
          <span>Learn the workflow model, language basics, browser runtime, interactivity, SQL, and How Built example.</span>
        </RouteLink>
        <RouteLink className="landing-section-card" onNavigate={onNavigate} to="/labs/interactivity">
          <FlaskConical size={18} aria-hidden="true" />
          <strong>Labs</strong>
          <span>Try the reactive PDL context and Algraf event demo with live source panels.</span>
        </RouteLink>
        <div className="landing-section-card landing-section-card-static">
          <Database size={18} aria-hidden="true" />
          <strong>Runtime Model</strong>
          <span>Studio runs PDL, Algraf, and SQL.js in the browser; the same .pdl and .ag files also run as native Rust CLIs with Polars and Arrow IPC streaming.</span>
        </div>
      </section>

      <section className="landing-cli-strip" aria-label="Native CLI">
        <div className="landing-cli-copy">
          <p className="eyebrow">
            <Terminal size={14} aria-hidden="true" />
            Same files, native binaries
          </p>
          <h2>Native Rust CLIs, Arrow IPC between them.</h2>
          <p>
            The .pdl and .ag files you edit in the browser also build as standalone Rust binaries. Pipe PDL's
            output straight into Algraf as Arrow IPC — columnar batches over stdout/stdin, no CSV roundtrip,
            no re-parsing between stages. Stays fast on large row sets, composes with the rest of your Unix
            toolbox.
          </p>
          <div className="landing-cli-links">
            <a href="https://williamcotton.github.io/pdl/">PDL site</a>
            <a href="https://williamcotton.github.io/algraf/">Algraf site</a>
            <a href="https://github.com/williamcotton/datafarm">Datafarm on GitHub</a>
          </div>
        </div>
        <pre className="landing-cli-pipe">
          <code>{`pdl run prep.pdl --stdout-format arrow-stream \\
  | algraf render chart.ag --data - --data-format arrow-stream \\
  --output chart.svg`}</code>
        </pre>
      </section>
    </div>
  );
}

function runLandingDemo(
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  dataSource: string,
  pdlSource: string,
  algrafSource: string,
): LandingSnapshot {
  const files = { [LANDING_DATA_PATH]: dataSource };

  try {
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      files,
      { kind: "diagnostics" },
      LANDING_PDL_PATH,
    );
    const pdlResult = pdlRuntime.run(pdlSource, files, { programPath: LANDING_PDL_PATH });
    const runtimeFiles: Record<string, string> = {
      ...files,
      ...(pdlResult.files ?? {}),
    };
    const preparedArtifact = selectSavedCsvArtifact(pdlResult.files, LANDING_OUTPUT_PATH);
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
      ...emptyLandingSnapshot(dataSource),
      error: errorMessage(error),
    };
  }
}

function emptyLandingSnapshot(dataSource: string): LandingSnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    algrafResult: null,
    algrafDiagnostics: [],
    runtimeFiles: { [LANDING_DATA_PATH]: dataSource },
    preparedArtifact: null,
    error: null,
  };
}

function landingDiagnostics(snapshot: LandingSnapshot, runtimeError: string | null): string[] {
  return [
    ...snapshot.pdlDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...(snapshot.pdlResult?.diagnostics ?? []).map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...snapshot.algrafDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    snapshot.error,
    runtimeError,
  ].filter((message): message is string => Boolean(message));
}
