import React from "react";
import type { AlgrafRuntime } from "algraf-wasm";
import { AlertCircle, BarChart3, CheckCircle2, Database, Play, Rows3, Table2, Workflow } from "lucide-react";
import type { PdlRuntime } from "pdl-wasm";

import { DataPanel } from "./DataPanel";
import { IdePrepPanel } from "./IdePrepPanel";
import { IdeSqlPanel } from "./IdeSqlPanel";
import { SqlPrepStatus } from "./SqlPrepStatus";
import { AlgrafEditor } from "../AlgrafEditor";
import { PdlEditor } from "../PdlEditor";
import { SqlEditor } from "../SqlEditor";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import { useIdeAlgrafSnapshot } from "../hooks/useIdeAlgrafSnapshot";
import { useIdeDataSource } from "../hooks/useIdeDataSource";
import { useIdePdlPreparation } from "../hooks/useIdePdlPreparation";
import { useSqlWorkspace } from "../hooks/useSqlWorkspace";
import {
  IDE_OUTPUT_PATH,
  diagnosticMessagesForSnapshot,
  diagnosticText,
  formatTime,
  runtimeLabel,
  sourceMetaFor,
} from "../idePdlWorkflow";
import type { RuntimeState } from "../studioTypes";
import { countDataRows, diagnosticsForAlgrafEditor } from "../studioUtils";

const IDE_SQL_MODEL_URI = "inmemory://datafarm/ide/workspace.sql";

type PreparationMode = "pdl" | "sql";

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
  const [preparationMode, setPreparationMode] = React.useState<PreparationMode>("pdl");

  const pdlReady = pdlState === "ready" && pdlRuntime != null;
  const algrafReady = algrafState === "ready" && algrafRuntime != null;

  const resetSqlToIdeSourceRef = React.useRef<() => void>(() => {});
  const data = useIdeDataSource(() => resetSqlToIdeSourceRef.current());

  const sql = useSqlWorkspace({
    dataSource: data.dataSource,
    sourceLanguage: data.sourceLanguage,
    sourceName: data.sourceName,
  });

  React.useEffect(() => {
    resetSqlToIdeSourceRef.current = sql.resetToIdeSource;
  }, [sql.resetToIdeSource]);

  const sourceFiles = React.useMemo(() => ({ [data.sourcePath]: data.dataSource }), [data.dataSource, data.sourcePath]);

  const pdlPreparation = useIdePdlPreparation(pdlRuntime, sourceFiles, preparationMode === "pdl" && pdlReady);

  const activePreparedCsv = preparationMode === "pdl" ? pdlPreparation.snapshot.preparedCsv : sql.sqlPreparedCsv;
  const activePreparedPath =
    preparationMode === "pdl" ? pdlPreparation.snapshot.preparedArtifact?.path ?? IDE_OUTPUT_PATH : IDE_OUTPUT_PATH;

  const activeRuntimeFiles = React.useMemo(() => {
    if (preparationMode === "pdl") {
      return pdlPreparation.snapshot.runtimeFiles;
    }
    return {
      ...sourceFiles,
      ...(sql.sqlPreparedCsv ? { [IDE_OUTPUT_PATH]: sql.sqlPreparedCsv } : {}),
    };
  }, [pdlPreparation.snapshot.runtimeFiles, preparationMode, sourceFiles, sql.sqlPreparedCsv]);

  const preparationError =
    preparationMode === "sql" && sql.sqlDiagnostic.severity === "error" ? diagnosticText(sql.sqlDiagnostic) : null;

  const { algrafSource, setAlgrafSource, snapshot } = useIdeAlgrafSnapshot({
    algrafRuntime,
    algrafReady,
    runtimeFiles: activeRuntimeFiles,
    preparedCsv: activePreparedCsv,
    pdlPreparation: pdlPreparation.snapshot,
    preparationError,
  });

  const outputCsv = activePreparedCsv;
  const diagnosticMessages = diagnosticMessagesForSnapshot(snapshot, runtimeError);
  const sourceMeta = sourceMetaFor(data.sourceLanguage, data.dataSource, data.sourceName);
  const activePreparationLabel = preparationMode === "pdl" ? "PDL" : "SQL";
  const preparedMeta =
    outputCsv && preparationMode === "sql" && sql.sqlLastPreparedAt
      ? `${countDataRows(outputCsv)} rows / SQL ${formatTime(sql.sqlLastPreparedAt)}`
      : `${countDataRows(outputCsv)} rows`;

  return (
    <div className="ide-page">
      <section className="ide-workspace-grid" aria-label="Datafarm IDE">
        <IdePrepPanel
          preparationMode={preparationMode}
          onPreparationModeChange={setPreparationMode}
          csvInputRef={data.csvInputRef}
          jsonInputRef={data.jsonInputRef}
          sqliteInputRef={sql.sqliteInputRef}
          sqliteUploadDisabled={!sql.sqlModule || sql.sqlBusy}
          onCsvUpload={data.handleCsvUpload}
          onJsonUpload={data.handleJsonUpload}
          onSqliteUpload={sql.handleSqliteUpload}
          activePreparationLabel={activePreparationLabel}
          activePreparedPath={activePreparedPath}
          outputCsv={outputCsv}
        />

        {preparationMode === "sql" ? (
          <IdeSqlPanel
            database={sql.sqlDatabase}
            databaseName={sql.sqlDatabaseName}
            refreshTrigger={sql.sqlLastPreparedAt}
          />
        ) : (
          <DataPanel
            className="ide-data-panel"
            icon={<Table2 size={16} aria-hidden="true" />}
            label={data.sourcePath}
            language={data.sourceLanguage}
            meta={sourceMeta}
            modelUri={`inmemory://datafarm/ide/${encodeURIComponent(data.sourcePath)}`}
            onChange={data.setDataSource}
            value={data.dataSource}
          />
        )}

        <article className="editor-panel ide-prep-panel">
          <div className="panel-header">
            <span>
              {preparationMode === "pdl" ? <Workflow size={16} aria-hidden="true" /> : <Database size={16} aria-hidden="true" />}
              {preparationMode === "pdl" ? "workspace.pdl" : "workspace.sql"}
            </span>
            {preparationMode === "sql" ? (
              <button className="primary-button ide-run-sql-button" disabled={!sql.sqlDatabase || sql.sqlBusy} onClick={sql.handleRunSql} type="button">
                <Play size={16} aria-hidden="true" />
                Run
              </button>
            ) : (
              <small>{runtimeLabel(pdlState)}</small>
            )}
          </div>
          <div className="editor-host ide-editor-host">
            {preparationMode === "pdl" ? (
              <PdlEditor
                diagnostics={snapshot.pdlDiagnostics}
                files={sourceFiles}
                modelUri="inmemory://datafarm/ide/workspace.pdl"
                onChange={pdlPreparation.setPdlSource}
                runtime={pdlRuntime}
                theme={DATAFARM_EDITOR_THEME}
                themeName={DATAFARM_EDITOR_THEME_NAME}
                value={pdlPreparation.pdlSource}
              />
            ) : (
              <SqlEditor modelUri={IDE_SQL_MODEL_URI} onChange={sql.setSqlSource} value={sql.sqlSource} />
            )}
          </div>
          {preparationMode === "sql" ? (
            <SqlPrepStatus
              databaseName={sql.sqlDatabaseName}
              diagnostic={sql.sqlDiagnostic}
              importMetadata={sql.sqlImport}
              result={sql.sqlResult}
              runtimeState={sql.sqlRuntimeState}
            />
          ) : null}
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
              {activePreparedPath}
            </span>
            <small>{preparedMeta}</small>
          </div>
          <pre className="output-block ide-output-block">
            {outputCsv || runtimeError || `Waiting for ${activePreparationLabel} output...`}
          </pre>
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
              <p>{activePreparationLabel} output matches the Algraf chart input.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
