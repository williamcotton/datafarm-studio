import React from "react";
import { AlgrafEditor } from "algraf-editor";
import type { AlgrafDiagnostic, AlgrafRenderResult, AlgrafRuntime } from "algraf-wasm";
import { AlertCircle, BarChart3, CheckCircle2, Database, Rows3, SlidersHorizontal, Table2, Workflow } from "lucide-react";
import { PdlEditor } from "pdl-editor";
import type { PdlContextValue, PdlEditorDiagnostic, PdlEditorServiceResult, PdlRunResult, PdlRuntime } from "pdl-wasm";

import { DataPanel } from "./DataPanel";
import { Metric } from "./Metric";
import { RuntimePill } from "./RuntimePill";
import { SqlWorkspacePage } from "./SqlWorkspacePage";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import type { RuntimeState } from "../studioTypes";
import { countDataRows, diagnosticsForAlgrafEditor, errorMessage } from "../studioUtils";

const IDE_DATA_PATH = "manual_series.csv";
const IDE_PDL_PATH = "memory/ide/workspace.pdl";
const IDE_OUTPUT_PATH = "visible_days.csv";

const DEFAULT_IDE_DATA = `day,value,segment
1,18,Baseline
2,34,Baseline
3,48,Growth
4,61,Growth
5,73,Peak
6,88,Peak
`;

const DEFAULT_IDE_PDL_SOURCE = `param visible_days = 4

output visible_days =
  load "manual_series.csv"
  | filter day <= $visible_days
  | select day, value, segment
  | save "visible_days.csv"
`;

const DEFAULT_IDE_ALGRAF_SOURCE = `Chart(
    data: "visible_days.csv",
    width: 560,
    height: 260,
    title: "Prepared series preview"
) {
    Theme(name: "minimal")
    Scale(fill: segment, label: "Segment")
    Scale(axis: x, type: "categorical")
    Scale(axis: y, domain: [0, 100], breaks: [0, 25, 50, 75, 100])
    Guide(axis: x, label: "Day")
    Guide(axis: y, label: "Value")

    Space(day * value) {
        Bar(fill: segment, tooltip: [day, value, segment], layout: "stack")
        Text(label: value, dy: -8, anchor: "middle", size: 10)
    }
}
`;

interface IdeSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  runtimeFiles: Record<string, string>;
  error: string | null;
}

export function IdePage({
  algrafRuntime,
  algrafState,
  pdlRuntime,
  pdlState,
  runtimeError,
}: {
  algrafRuntime: AlgrafRuntime | null;
  algrafState: RuntimeState;
  pdlRuntime: PdlRuntime | null;
  pdlState: RuntimeState;
  runtimeError: string | null;
}): React.ReactElement {
  const [visibleDays, setVisibleDays] = React.useState(4);
  const [dataSource, setDataSource] = React.useState(DEFAULT_IDE_DATA);
  const [pdlSource, setPdlSource] = React.useState(DEFAULT_IDE_PDL_SOURCE);
  const [algrafSource, setAlgrafSource] = React.useState(DEFAULT_IDE_ALGRAF_SOURCE);
  const runtimeReady = pdlState === "ready" && algrafState === "ready" && pdlRuntime != null && algrafRuntime != null;
  const snapshot = React.useMemo(() => {
    if (!runtimeReady) {
      return emptyIdeSnapshot(dataSource);
    }
    return runIdeWorkspace(pdlRuntime, algrafRuntime, dataSource, pdlSource, algrafSource, visibleDays);
  }, [algrafRuntime, algrafSource, dataSource, pdlRuntime, pdlSource, runtimeReady, visibleDays]);
  const outputCsv = snapshot.pdlResult?.files?.[IDE_OUTPUT_PATH] ?? "";
  const diagnosticMessages = diagnosticMessagesForSnapshot(snapshot, runtimeError);

  return (
    <div className="ide-page">
      <section className="ide-hero">
        <div className="hero-copy">
          <p className="eyebrow">Primary product surface</p>
          <h1>Datafarm IDE</h1>
          <p>
            Edit local data, prepare it with PDL, render it with Algraf, inspect generated output, watch diagnostics, and
            use the SQL workspace without leaving the browser.
          </p>
        </div>
        <div className="hero-status" aria-label="IDE runtime metrics">
          <Metric label="PDL" value={runtimeLabel(pdlState)} />
          <Metric label="Algraf" value={runtimeLabel(algrafState)} />
          <Metric label="Prepared rows" value={String(countDataRows(outputCsv))} />
          <Metric label="Diagnostics" value={String(diagnosticMessages.length)} />
        </div>
      </section>

      <section className="control-panel ide-runtime-panel" aria-label="IDE runtime controls">
        <div className="panel-header">
          <span>
            <SlidersHorizontal size={16} aria-hidden="true" />
            Run context
          </span>
          <div className="runtime-pills" aria-label="Runtime status">
            <RuntimePill label="PDL" state={pdlState} />
            <RuntimePill label="Algraf" state={algrafState} />
          </div>
        </div>
        <div className="control-grid ide-control-grid">
          <label className="control-field">
            <span>Visible days</span>
            <strong>{visibleDays}</strong>
            <input
              min={1}
              max={6}
              onChange={(event) => setVisibleDays(Number(event.currentTarget.value))}
              type="range"
              value={visibleDays}
            />
          </label>
        </div>
      </section>

      <section className="ide-workspace-grid" aria-label="PDL and Algraf IDE workspace">
        <DataPanel
          className="ide-data-panel"
          icon={<Table2 size={16} aria-hidden="true" />}
          label={IDE_DATA_PATH}
          language="csv"
          meta={`${countDataRows(dataSource)} rows`}
          modelUri="inmemory://datafarm/ide/manual_series.csv"
          onChange={setDataSource}
          value={dataSource}
        />

        <article className="editor-panel ide-pdl-panel">
          <div className="panel-header">
            <span>
              <Workflow size={16} aria-hidden="true" />
              workspace.pdl
            </span>
            <small>PDL</small>
          </div>
          <div className="editor-host ide-editor-host">
            <PdlEditor
              diagnostics={snapshot.pdlDiagnostics}
              files={{ [IDE_DATA_PATH]: dataSource }}
              modelUri="inmemory://datafarm/ide/workspace.pdl"
              onChange={setPdlSource}
              runtime={pdlRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={pdlSource}
            />
          </div>
        </article>

        <article className="editor-panel ide-algraf-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              preview.ag
            </span>
            <small>Algraf</small>
          </div>
          <div className="editor-host ide-editor-host">
            <AlgrafEditor
              diagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
              files={snapshot.runtimeFiles}
              modelUri="inmemory://datafarm/ide/preview.ag"
              onChange={setAlgrafSource}
              runtime={algrafRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={algrafSource}
            />
          </div>
        </article>

        <article className="result-panel ide-output-panel">
          <div className="panel-header">
            <span>
              <Rows3 size={16} aria-hidden="true" />
              {IDE_OUTPUT_PATH}
            </span>
            <small>{countDataRows(outputCsv)} rows</small>
          </div>
          <pre className="output-block ide-output-block">{outputCsv || runtimeError || "Waiting for PDL output..."}</pre>
        </article>

        <article className="result-panel ide-chart-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              Chart preview
            </span>
            <small>Algraf SVG</small>
          </div>
          <div className="chart-stage ide-chart-stage">
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

        <article className={`result-panel ide-diagnostics-panel ${diagnosticMessages.length > 0 ? "ide-diagnostics-panel-error" : ""}`}>
          <div className="panel-header">
            <span>
              {diagnosticMessages.length > 0 ? <AlertCircle size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              Diagnostics
            </span>
            <small>{diagnosticMessages.length}</small>
          </div>
          <div className="ide-diagnostics-list" role={diagnosticMessages.length > 0 ? "alert" : "status"}>
            {diagnosticMessages.length > 0 ? (
              diagnosticMessages.map((message) => <p key={message}>{message}</p>)
            ) : (
              <p>PDL output and Algraf chart are in sync.</p>
            )}
          </div>
        </article>
      </section>

      <section className="ide-sql-section" aria-label="IDE SQL workspace">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SQL workspace</p>
            <h2>Browser-local relational scratchpad</h2>
            <p className="section-copy">
              Import CSV, open SQLite databases, inspect schemas, run SQL, export results, and keep the SQL work separate
              from PDL and Algraf language semantics.
            </p>
          </div>
          <Database size={22} aria-hidden="true" />
        </div>
        <SqlWorkspacePage embedded />
      </section>
    </div>
  );
}

function runIdeWorkspace(
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  dataSource: string,
  pdlSource: string,
  algrafSource: string,
  visibleDays: number,
): IdeSnapshot {
  const files = { [IDE_DATA_PATH]: dataSource };

  try {
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      files,
      { kind: "diagnostics" },
      IDE_PDL_PATH,
    );
    const pdlResult = pdlRuntime.run(pdlSource, files, {
      context: { visible_days: visibleDays } satisfies Record<string, PdlContextValue>,
      programPath: IDE_PDL_PATH,
    });
    const runtimeFiles: Record<string, string> = {
      ...files,
      ...(pdlResult.files ?? {}),
    };
    const algrafResult = runtimeFiles[IDE_OUTPUT_PATH] ? algrafRuntime.render(algrafSource, runtimeFiles) : null;

    return {
      pdlResult,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      runtimeFiles,
      error: pdlEditorResponse.error ?? pdlResult.error ?? algrafResult?.error ?? null,
    };
  } catch (error: unknown) {
    return {
      ...emptyIdeSnapshot(dataSource),
      error: errorMessage(error),
    };
  }
}

function emptyIdeSnapshot(dataSource: string): IdeSnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    algrafResult: null,
    algrafDiagnostics: [],
    runtimeFiles: { [IDE_DATA_PATH]: dataSource },
    error: null,
  };
}

function diagnosticMessagesForSnapshot(snapshot: IdeSnapshot, runtimeError: string | null): string[] {
  return [
    ...snapshot.pdlDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...(snapshot.pdlResult?.diagnostics ?? []).map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...snapshot.algrafDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    snapshot.error,
    runtimeError,
  ].filter((message): message is string => Boolean(message));
}

function runtimeLabel(state: RuntimeState): string {
  return state === "ready" ? "Ready" : state === "error" ? "Error" : "Loading";
}
