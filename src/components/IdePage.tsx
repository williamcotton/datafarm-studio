import React from "react";
import type { AlgrafDiagnostic, AlgrafRenderResult, AlgrafRuntime } from "algraf-wasm";
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import { AlertCircle, BarChart3, CheckCircle2, Database, FileUp, Play, Rows3, Table2, Workflow } from "lucide-react";
import type { PdlEditorDiagnostic, PdlEditorServiceResult, PdlRunResult, PdlRuntime } from "pdl-wasm";

import { DataPanel } from "./DataPanel";
import { SqlTableViewer } from "./SqlTableViewer";
import { AlgrafEditor } from "../AlgrafEditor";
import { PdlEditor } from "../PdlEditor";
import { SqlEditor } from "../SqlEditor";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import { publicAssetUrl } from "../publicAssets";
import { csvFromSqlResult, importCsvIntoDatabase, runSqlQuery } from "../sqlWorkspace";
import type { RuntimeState, SqlDiagnostic, SqlImportMetadata, SqlQueryResult } from "../studioTypes";
import { countDataRows, diagnosticsForAlgrafEditor, errorMessage, selectSavedCsvArtifact, type SavedCsvArtifact } from "../studioUtils";

const IDE_DATA_PATH = "manual_series.csv";
const IDE_PDL_PATH = "memory/ide/workspace.pdl";
const IDE_OUTPUT_PATH = "prepared_series.csv";
const IDE_SQL_TABLE_NAME = "manual_series";
const IDE_SQL_MODEL_URI = "inmemory://datafarm/ide/workspace.sql";

const DEFAULT_IDE_DATA = `day,value,segment
1,18,Baseline
2,34,Baseline
3,48,Growth
4,61,Growth
5,73,Peak
6,88,Peak
`;

const DEFAULT_IDE_PDL_SOURCE = `output prepared_series =
  load "manual_series.csv"
  | select day, value, segment
  | save "prepared_series.csv"
`;

const DEFAULT_IDE_SQL_SOURCE = `SELECT day, value, segment
FROM manual_series
ORDER BY CAST(day AS INTEGER);`;

const DEFAULT_IDE_ALGRAF_SOURCE = `Chart(
    data: "prepared_series.csv",
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

type PreparationMode = "pdl" | "sql";
type IdeSourceLanguage = "csv" | "json";
type SqlDatabaseSource = "ide-source" | "sqlite-upload";

interface IdeSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  runtimeFiles: Record<string, string>;
  error: string | null;
}

interface PdlPreparationSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  preparedCsv: string;
  preparedArtifact: SavedCsvArtifact | null;
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
  const [preparationMode, setPreparationMode] = React.useState<PreparationMode>("pdl");
  const [dataSource, setDataSource] = React.useState(DEFAULT_IDE_DATA);
  const [sourcePath, setSourcePath] = React.useState(IDE_DATA_PATH);
  const [sourceName, setSourceName] = React.useState(IDE_DATA_PATH);
  const [sourceLanguage, setSourceLanguage] = React.useState<IdeSourceLanguage>("csv");
  const [pdlSource, setPdlSource] = React.useState(DEFAULT_IDE_PDL_SOURCE);
  const [sqlSource, setSqlSource] = React.useState(DEFAULT_IDE_SQL_SOURCE);
  const [algrafSource, setAlgrafSource] = React.useState(DEFAULT_IDE_ALGRAF_SOURCE);
  const [sqlRuntimeState, setSqlRuntimeState] = React.useState<RuntimeState>("loading");
  const [sqlModule, setSqlModule] = React.useState<SqlJsStatic | null>(null);
  const [sqlDatabase, setSqlDatabase] = React.useState<SqlJsDatabase | null>(null);
  const [sqlDatabaseName, setSqlDatabaseName] = React.useState(IDE_DATA_PATH);
  const [sqlDatabaseSource, setSqlDatabaseSource] = React.useState<SqlDatabaseSource>("ide-source");
  const [sqlImport, setSqlImport] = React.useState<SqlImportMetadata | null>(null);
  const [sqlResult, setSqlResult] = React.useState<SqlQueryResult | null>(null);
  const [sqlPreparedCsv, setSqlPreparedCsv] = React.useState("");
  const [sqlLastPreparedAt, setSqlLastPreparedAt] = React.useState<number | null>(null);
  const [sqlDiagnostic, setSqlDiagnostic] = React.useState<SqlDiagnostic>({
    severity: "info",
    message: "SQL.js is loading.",
  });
  const [sqlBusy, setSqlBusy] = React.useState(false);
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);
  const jsonInputRef = React.useRef<HTMLInputElement | null>(null);
  const sqliteInputRef = React.useRef<HTMLInputElement | null>(null);
  const sqlDatabaseRef = React.useRef<SqlJsDatabase | null>(null);
  const sqlSourceRef = React.useRef(sqlSource);

  const pdlReady = pdlState === "ready" && pdlRuntime != null;
  const algrafReady = algrafState === "ready" && algrafRuntime != null;
  const sourceFiles = React.useMemo(() => ({ [sourcePath]: dataSource }), [dataSource, sourcePath]);
  const executeSqlPreparation = React.useCallback((database: SqlJsDatabase, query: string) => {
    try {
      const result = runSqlQuery(database, query);
      if (result.columns.length === 0) {
        setSqlResult(result);
        setSqlDiagnostic({
          severity: "error",
          message: "SQL statement did not return a table.",
          detail: `The previous ${IDE_OUTPUT_PATH} artifact was left unchanged.`,
        });
        return;
      }

      const csv = csvFromSqlResult(result);
      setSqlResult(result);
      setSqlPreparedCsv(csv);
      setSqlLastPreparedAt(Date.now());
      setSqlDiagnostic({
        severity: "success",
        message: `SQL prepared ${result.rows.length} row${result.rows.length === 1 ? "" : "s"} as ${IDE_OUTPUT_PATH}.`,
        detail: `${result.columns.length} query column${result.columns.length === 1 ? "" : "s"}.`,
      });
    } catch (error: unknown) {
      setSqlResult(null);
      setSqlDiagnostic({
        severity: "error",
        message: "SQL preparation failed.",
        detail: `${errorMessage(error)} The previous ${IDE_OUTPUT_PATH} artifact was left unchanged.`,
      });
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    setSqlRuntimeState("loading");
    initSqlJs({
      locateFile: () => publicAssetUrl("wasm/sql-wasm.wasm"),
    })
      .then((module) => {
        if (cancelled) {
          return;
        }
        setSqlModule(module);
        setSqlRuntimeState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setSqlRuntimeState("error");
        setSqlDiagnostic({
          severity: "error",
          message: "SQL.js failed to load.",
          detail: errorMessage(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      sqlDatabaseRef.current?.close();
      sqlDatabaseRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    sqlSourceRef.current = sqlSource;
  }, [sqlSource]);

  React.useEffect(() => {
    if (!sqlModule) {
      return;
    }
    if (sqlDatabaseSource !== "ide-source") {
      return;
    }
    if (sourceLanguage !== "csv") {
      sqlDatabaseRef.current?.close();
      sqlDatabaseRef.current = null;
      setSqlDatabase(null);
      setSqlDatabaseName(sourceName);
      setSqlImport(null);
      setSqlResult(null);
      setSqlPreparedCsv("");
      setSqlLastPreparedAt(null);
      setSqlDiagnostic({
        severity: "error",
        message: "SQL mode needs CSV source data or a SQLite database.",
        detail: "Upload a CSV as the active source, or switch to SQL mode and open a SQLite database.",
      });
      return;
    }

    const nextDatabase = new sqlModule.Database();
    try {
      const nextImport = importCsvIntoDatabase(nextDatabase, IDE_DATA_PATH, dataSource);
      sqlDatabaseRef.current?.close();
      sqlDatabaseRef.current = nextDatabase;
      setSqlDatabase(nextDatabase);
      setSqlDatabaseName(sourceName);
      setSqlImport(nextImport);
      setSqlDiagnostic({
        severity: "success",
        message: `Loaded ${IDE_DATA_PATH} into SQL as ${nextImport.tableName}.`,
        detail: `${nextImport.rowCount} row${nextImport.rowCount === 1 ? "" : "s"} from the active IDE source CSV.`,
      });
      executeSqlPreparation(nextDatabase, sqlSourceRef.current);
    } catch (error: unknown) {
      nextDatabase.close();
      sqlDatabaseRef.current?.close();
      sqlDatabaseRef.current = null;
      setSqlDatabase(null);
      setSqlImport(null);
      setSqlResult(null);
      setSqlPreparedCsv("");
      setSqlLastPreparedAt(null);
      setSqlDiagnostic({
        severity: "error",
        message: "IDE source CSV could not be loaded into SQL.",
        detail: errorMessage(error),
      });
    }
  }, [dataSource, executeSqlPreparation, sourceLanguage, sourceName, sqlDatabaseSource, sqlModule]);

  const pdlPreparation = React.useMemo(() => {
    if (preparationMode !== "pdl" || !pdlReady) {
      return emptyPdlPreparationSnapshot(sourceFiles);
    }
    return runPdlPreparation(pdlRuntime, sourceFiles, pdlSource);
  }, [pdlReady, pdlRuntime, pdlSource, preparationMode, sourceFiles]);

  const activePreparedCsv = preparationMode === "pdl" ? pdlPreparation.preparedCsv : sqlPreparedCsv;
  const activePreparedPath =
    preparationMode === "pdl" ? pdlPreparation.preparedArtifact?.path ?? IDE_OUTPUT_PATH : IDE_OUTPUT_PATH;
  const activeRuntimeFiles = React.useMemo(() => {
    if (preparationMode === "pdl") {
      return pdlPreparation.runtimeFiles;
    }

    return {
      ...sourceFiles,
      ...(sqlPreparedCsv ? { [IDE_OUTPUT_PATH]: sqlPreparedCsv } : {}),
    };
  }, [pdlPreparation.runtimeFiles, preparationMode, sourceFiles, sqlPreparedCsv]);
  const snapshot = React.useMemo(() => {
    if (!algrafReady) {
      return {
        pdlResult: pdlPreparation.pdlResult,
        pdlDiagnostics: pdlPreparation.pdlDiagnostics,
        algrafResult: null,
        algrafDiagnostics: [],
        runtimeFiles: activeRuntimeFiles,
        error: pdlPreparation.error,
      };
    }

    return renderIdeWorkspace(
      algrafRuntime,
      algrafSource,
      activeRuntimeFiles,
      activePreparedCsv,
      pdlPreparation,
      preparationMode === "sql" && sqlDiagnostic.severity === "error" ? diagnosticText(sqlDiagnostic) : null,
    );
  }, [
    activePreparedCsv,
    activeRuntimeFiles,
    algrafReady,
    algrafRuntime,
    algrafSource,
    pdlPreparation,
    preparationMode,
    sqlDiagnostic,
  ]);
  const outputCsv = activePreparedCsv;
  const diagnosticMessages = diagnosticMessagesForSnapshot(snapshot, runtimeError);
  const sourceMeta = sourceMetaFor(sourceLanguage, dataSource, sourceName);
  const activePreparationLabel = preparationMode === "pdl" ? "PDL" : "SQL";
  const preparedMeta =
    outputCsv && preparationMode === "sql" && sqlLastPreparedAt
      ? `${countDataRows(outputCsv)} rows / SQL ${formatTime(sqlLastPreparedAt)}`
      : `${countDataRows(outputCsv)} rows`;

  const handleCsvUpload = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const source = await file.text();
    setSourcePath(IDE_DATA_PATH);
    setSourceName(file.name);
    setSourceLanguage("csv");
    setDataSource(source);
    setSqlDatabaseSource("ide-source");
  }, []);

  const handleJsonUpload = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const source = await file.text();
    const nextPath = file.name || (file.type === "application/json" ? "source.json" : "source.ljson");
    setSourcePath(nextPath);
    setSourceName(file.name || nextPath);
    setSourceLanguage("json");
    setDataSource(source);
    setSqlDatabaseSource("ide-source");
  }, []);

  const handleSqliteUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";
      if (!file || !sqlModule) {
        return;
      }

      setSqlBusy(true);
      try {
        const buffer = await file.arrayBuffer();
        const nextDatabase = new sqlModule.Database(new Uint8Array(buffer));
        sqlDatabaseRef.current?.close();
        sqlDatabaseRef.current = nextDatabase;
        setSqlDatabase(nextDatabase);
        setSqlDatabaseName(file.name);
        setSqlDatabaseSource("sqlite-upload");
        setSqlImport(null);
        setSqlResult(null);
        setSqlPreparedCsv("");
        setSqlLastPreparedAt(null);
        setSqlDiagnostic({
          severity: "success",
          message: `Opened ${file.name} as the SQL database.`,
          detail: "Run a query that returns the columns your Algraf chart expects.",
        });
      } catch (error: unknown) {
        setSqlDiagnostic({
          severity: "error",
          message: "SQLite database upload failed.",
          detail: errorMessage(error),
        });
      } finally {
        setSqlBusy(false);
      }
    },
    [sqlModule],
  );

  const handleRunSql = React.useCallback(() => {
    if (!sqlDatabase) {
      setSqlDiagnostic({
        severity: "error",
        message: "SQL database is not ready.",
        detail: "The active IDE source CSV must load before SQL can run.",
      });
      return;
    }

    setSqlBusy(true);
    window.setTimeout(() => {
      executeSqlPreparation(sqlDatabase, sqlSource);
      setSqlBusy(false);
    }, 0);
  }, [executeSqlPreparation, sqlDatabase, sqlSource]);

  return (
    <div className="ide-page">
      <section className="ide-workspace-grid" aria-label="Datafarm IDE">
        <aside className="control-panel ide-sidebar-panel" aria-label="IDE preparation controls">
          <div className="ide-sidebar-controls">
            <div className="segmented-control ide-mode-control" aria-label="Preparation mode">
              <button aria-pressed={preparationMode === "pdl"} onClick={() => setPreparationMode("pdl")} type="button">
                PDL
              </button>
              <button aria-pressed={preparationMode === "sql"} onClick={() => setPreparationMode("sql")} type="button">
                SQL
              </button>
            </div>
            <button className="secondary-button" onClick={() => csvInputRef.current?.click()} type="button">
              <FileUp size={16} aria-hidden="true" />
              Upload CSV
            </button>
            <button className="secondary-button" onClick={() => jsonInputRef.current?.click()} type="button">
              <FileUp size={16} aria-hidden="true" />
              Upload JSON
            </button>
            {preparationMode === "sql" ? (
              <button className="secondary-button" disabled={!sqlModule || sqlBusy} onClick={() => sqliteInputRef.current?.click()} type="button">
                <Database size={16} aria-hidden="true" />
                Open SQLite
              </button>
            ) : null}
            <input
              accept=".csv,text/csv"
              className="visually-hidden"
              hidden
              onChange={handleCsvUpload}
              ref={csvInputRef}
              type="file"
            />
            <input
              accept=".json,.ljson,application/json,application/x-ndjson"
              className="visually-hidden"
              hidden
              onChange={handleJsonUpload}
              ref={jsonInputRef}
              type="file"
            />
            <input
              accept=".sqlite,.sqlite3,.db,application/vnd.sqlite3,application/x-sqlite3"
              className="visually-hidden"
              hidden
              onChange={handleSqliteUpload}
              ref={sqliteInputRef}
              type="file"
            />
            <div className="ide-artifact-summary">
              <span>
                <strong>Prepare</strong>
                {activePreparationLabel}
              </span>
              <span>
                <strong>Artifact</strong>
                {activePreparedPath}
              </span>
              <span>
                <strong>Rows</strong>
                {countDataRows(outputCsv)}
              </span>
            </div>
          </div>
        </aside>

        {preparationMode === "sql" ? (
          <SqlTableViewer
            database={sqlDatabase}
            databaseName={sqlDatabaseName}
            refreshTrigger={sqlLastPreparedAt}
          />
        ) : (
          <DataPanel
            className="ide-data-panel"
            icon={<Table2 size={16} aria-hidden="true" />}
            label={sourcePath}
            language={sourceLanguage}
            meta={sourceMeta}
            modelUri={`inmemory://datafarm/ide/${encodeURIComponent(sourcePath)}`}
            onChange={setDataSource}
            value={dataSource}
          />
        )}

        <article className="editor-panel ide-prep-panel">
          <div className="panel-header">
            <span>
              {preparationMode === "pdl" ? <Workflow size={16} aria-hidden="true" /> : <Database size={16} aria-hidden="true" />}
              {preparationMode === "pdl" ? "workspace.pdl" : "workspace.sql"}
            </span>
            {preparationMode === "sql" ? (
              <button className="primary-button ide-run-sql-button" disabled={!sqlDatabase || sqlBusy} onClick={handleRunSql} type="button">
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
                onChange={setPdlSource}
                runtime={pdlRuntime}
                theme={DATAFARM_EDITOR_THEME}
                themeName={DATAFARM_EDITOR_THEME_NAME}
                value={pdlSource}
              />
            ) : (
              <SqlEditor modelUri={IDE_SQL_MODEL_URI} onChange={setSqlSource} value={sqlSource} />
            )}
          </div>
          {preparationMode === "sql" ? (
            <SqlPrepStatus
              databaseName={sqlDatabaseName}
              diagnostic={sqlDiagnostic}
              importMetadata={sqlImport}
              result={sqlResult}
              runtimeState={sqlRuntimeState}
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

function runPdlPreparation(
  pdlRuntime: PdlRuntime | null,
  sourceFiles: Record<string, string>,
  pdlSource: string,
): PdlPreparationSnapshot {
  if (!pdlRuntime) {
    return emptyPdlPreparationSnapshot(sourceFiles);
  }

  try {
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      sourceFiles,
      { kind: "diagnostics" },
      IDE_PDL_PATH,
    );
    const pdlResult = pdlRuntime.run(pdlSource, sourceFiles, {
      programPath: IDE_PDL_PATH,
    });
    const runtimeFiles: Record<string, string> = {
      ...sourceFiles,
      ...(pdlResult.files ?? {}),
    };
    const preparedArtifact = selectSavedCsvArtifact(pdlResult.files, IDE_OUTPUT_PATH);

    return {
      pdlResult,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      preparedCsv: preparedArtifact?.csv ?? "",
      preparedArtifact,
      runtimeFiles,
      error: pdlEditorResponse.error ?? pdlResult.error ?? null,
    };
  } catch (error: unknown) {
    return {
      ...emptyPdlPreparationSnapshot(sourceFiles),
      error: errorMessage(error),
    };
  }
}

function renderIdeWorkspace(
  algrafRuntime: AlgrafRuntime | null,
  algrafSource: string,
  runtimeFiles: Record<string, string>,
  preparedCsv: string,
  pdlPreparation: PdlPreparationSnapshot,
  preparationError: string | null,
): IdeSnapshot {
  if (!algrafRuntime) {
    return {
      pdlResult: pdlPreparation.pdlResult,
      pdlDiagnostics: pdlPreparation.pdlDiagnostics,
      algrafResult: null,
      algrafDiagnostics: [],
      runtimeFiles,
      error: pdlPreparation.error ?? preparationError,
    };
  }

  try {
    const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, runtimeFiles) : null;
    return {
      pdlResult: pdlPreparation.pdlResult,
      pdlDiagnostics: pdlPreparation.pdlDiagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      runtimeFiles,
      error: pdlPreparation.error ?? preparationError ?? algrafResult?.error ?? null,
    };
  } catch (error: unknown) {
    return {
      pdlResult: pdlPreparation.pdlResult,
      pdlDiagnostics: pdlPreparation.pdlDiagnostics,
      algrafResult: null,
      algrafDiagnostics: [],
      runtimeFiles,
      error: errorMessage(error),
    };
  }
}

function emptyPdlPreparationSnapshot(sourceFiles: Record<string, string>): PdlPreparationSnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    preparedCsv: "",
    preparedArtifact: null,
    runtimeFiles: sourceFiles,
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

function diagnosticText(diagnostic: SqlDiagnostic): string {
  return diagnostic.detail ? `${diagnostic.message} ${diagnostic.detail}` : diagnostic.message;
}

function runtimeLabel(state: RuntimeState): string {
  return state === "ready" ? "Ready" : state === "error" ? "Error" : "Loading";
}

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sourceMetaFor(language: IdeSourceLanguage, source: string, name: string): string {
  if (language === "csv") {
    return `${countDataRows(source)} rows${name !== IDE_DATA_PATH ? ` / ${name}` : ""}`;
  }

  const lineCount = source.trim() ? source.replace(/\n$/, "").split(/\r?\n/).length : 0;
  const label = name.toLowerCase().endsWith(".ljson") ? "LJSON" : "JSON";
  return `${label}${lineCount > 0 ? ` / ${lineCount} lines` : ""}`;
}

function SqlPrepStatus({
  databaseName,
  diagnostic,
  importMetadata,
  result,
  runtimeState,
}: {
  databaseName: string;
  diagnostic: SqlDiagnostic;
  importMetadata: SqlImportMetadata | null;
  result: SqlQueryResult | null;
  runtimeState: RuntimeState;
}): React.ReactElement {
  const isError = diagnostic.severity === "error";
  return (
    <div className={`ide-sql-status ${isError ? "ide-sql-status-error" : ""}`} role={isError ? "alert" : "status"}>
      <div>
        <strong>SQL.js {runtimeLabel(runtimeState)}</strong>
        <span>{diagnostic.message}</span>
        {diagnostic.detail ? <small>{diagnostic.detail}</small> : null}
      </div>
      <div>
        <strong>{importMetadata?.tableName ?? databaseName}</strong>
        <span>
          {importMetadata
            ? `${importMetadata.rowCount} rows / ${importMetadata.columnCount} columns`
            : "SQLite database"}
        </span>
        <small>
          {result?.columns.length
            ? `${result.rows.length} result rows`
            : result
              ? "Statement returned no table"
              : importMetadata
                ? `source table from ${IDE_DATA_PATH}`
                : "run a SQL query"}
        </small>
      </div>
    </div>
  );
}
