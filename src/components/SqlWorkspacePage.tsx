// Standalone SQL workspace page plus an embedded reuse path for the IDE
// SQL prep mode.
//
// When rendered with embedded={true}, IdePage swaps the SqlWorkspacePage
// hero (title + Metrics row) for the IDE chrome around it. The toolbar,
// table browser, query panel, result panel, and imports panel are
// identical in both modes. SqlWorkspacePage owns its own SQL.js runtime
// instance via useSqlRuntime; the IDE path uses useSqlWorkspace instead
// so the two SQL.js instances stay independent (no shared React
// context).

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database as DatabaseIcon,
  Download,
  FileSpreadsheet,
  Play,
  Plus,
  Rows3,
  Table2,
  Upload,
} from "lucide-react";

import { Metric } from "./Metric";
import { SqlResultGrid } from "./SqlResultGrid";
import { SqlTableBrowser } from "./SqlTableBrowser";
import { SqlEditor } from "../SqlEditor";
import { useSqlQuery } from "../hooks/useSqlQuery";
import { useSqlRuntime } from "../hooks/useSqlRuntime";
import {
  DEFAULT_SQL_QUERY,
  csvFromSqlResult,
  importCsvIntoDatabase,
  runSqlQuery,
  selectSqlPreviewQuery,
} from "../sqlWorkspace";
import type { SqlDiagnostic, SqlImportMetadata } from "../studioTypes";
import { errorMessage, formatBytes } from "../studioUtils";

export function SqlWorkspacePage({ embedded = false }: { embedded?: boolean } = {}): React.ReactElement {
  const runtime = useSqlRuntime();
  const queryHook = useSqlQuery();
  const [imports, setImports] = React.useState<SqlImportMetadata[]>([]);
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);
  const databaseInputRef = React.useRef<HTMLInputElement | null>(null);

  const {
    sqlModule,
    sqlRuntimeState,
    database,
    databaseName,
    tables,
    selectedTableName,
    setSelectedTableName,
    diagnostic,
    setDiagnostic,
    setActiveDatabase,
    refreshTables,
  } = runtime;
  const { query, setQuery, queryResult, setQueryResult, busy, setBusy } = queryHook;

  const executeQueryWithDatabase = React.useCallback(
    (activeDatabase: import("sql.js").Database, nextQuery: string) => {
      if (!nextQuery.trim()) {
        setDiagnostic({
          severity: "error",
          message: "SQL query is empty.",
          detail: "Enter at least one SQL statement before running the query.",
        });
        return;
      }

      try {
        const result = runSqlQuery(activeDatabase, nextQuery);
        setQueryResult(result);
        refreshTables(activeDatabase);
        setDiagnostic({
          severity: "success",
          message:
            result.columns.length > 0
              ? `Query returned ${result.rows.length} row${result.rows.length === 1 ? "" : "s"}.`
              : "Statement executed without returning rows.",
        });
      } catch (error: unknown) {
        setQueryResult(null);
        setDiagnostic({
          severity: "error",
          message: "SQL query failed.",
          detail: errorMessage(error),
        });
      }
    },
    [refreshTables, setDiagnostic, setQueryResult],
  );

  const initialisedRef = React.useRef(false);
  React.useEffect(() => {
    if (initialisedRef.current || !sqlModule || database) {
      return;
    }
    initialisedRef.current = true;
    const nextDatabase = new sqlModule.Database();
    setActiveDatabase(nextDatabase, "Untitled memory database");
    executeQueryWithDatabase(nextDatabase, DEFAULT_SQL_QUERY);
    setDiagnostic({
      severity: "success",
      message: "SQL.js is ready with a new in-memory database.",
      detail: "The database is browser-local and resets when this page is reloaded.",
    });
  }, [database, executeQueryWithDatabase, setActiveDatabase, setDiagnostic, sqlModule]);

  const handleCreateDatabase = React.useCallback(() => {
    if (!sqlModule) {
      return;
    }

    const nextDatabase = new sqlModule.Database();
    setActiveDatabase(nextDatabase, "Untitled memory database");
    setImports([]);
    setQuery(DEFAULT_SQL_QUERY);
    setQueryResult(null);
    executeQueryWithDatabase(nextDatabase, DEFAULT_SQL_QUERY);
    setDiagnostic({
      severity: "success",
      message: "Created a new in-memory SQLite database.",
      detail: "No filesystem or server persistence is attached.",
    });
  }, [executeQueryWithDatabase, setActiveDatabase, setDiagnostic, setQuery, setQueryResult, sqlModule]);

  const handleRunQuery = React.useCallback(() => {
    if (!database) {
      setDiagnostic({
        severity: "error",
        message: "No active SQLite database.",
        detail: "Create a database or open a SQLite file before running SQL.",
      });
      return;
    }

    setBusy(true);
    window.setTimeout(() => {
      executeQueryWithDatabase(database, query);
      setBusy(false);
    }, 0);
  }, [database, executeQueryWithDatabase, query, setBusy, setDiagnostic]);

  const handleCsvUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.currentTarget.files ?? []);
      event.currentTarget.value = "";

      if (files.length === 0 || !database) {
        return;
      }

      setBusy(true);
      try {
        const nextImports: SqlImportMetadata[] = [];
        for (const file of files) {
          const source = await file.text();
          nextImports.push(importCsvIntoDatabase(database, file.name, source));
        }

        setImports((current) => [...nextImports, ...current]);
        refreshTables(database);

        const lastImport = nextImports[nextImports.length - 1];
        if (lastImport) {
          const previewQuery = selectSqlPreviewQuery(lastImport.tableName);
          setSelectedTableName(lastImport.tableName);
          setQuery(previewQuery);
          executeQueryWithDatabase(database, previewQuery);
        }

        setDiagnostic({
          severity: "success",
          message: `Imported ${nextImports.length} CSV file${nextImports.length === 1 ? "" : "s"} into SQLite.`,
          detail: nextImports.map((item) => `${item.sourceName} -> ${item.tableName}`).join(", "),
        });
      } catch (error: unknown) {
        setDiagnostic({
          severity: "error",
          message: "CSV import failed.",
          detail: errorMessage(error),
        });
      } finally {
        setBusy(false);
      }
    },
    [database, executeQueryWithDatabase, refreshTables, setBusy, setDiagnostic, setQuery, setSelectedTableName],
  );

  const handleDatabaseUpload = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0] ?? null;
      event.currentTarget.value = "";

      if (!file || !sqlModule) {
        return;
      }

      setBusy(true);
      try {
        const buffer = await file.arrayBuffer();
        const nextDatabase = new sqlModule.Database(new Uint8Array(buffer));
        setActiveDatabase(nextDatabase, file.name);
        setImports([]);
        setQuery(DEFAULT_SQL_QUERY);
        executeQueryWithDatabase(nextDatabase, DEFAULT_SQL_QUERY);
        setDiagnostic({
          severity: "success",
          message: `Opened ${file.name} as the active SQLite database.`,
          detail: `${formatBytes(file.size)} loaded into browser memory.`,
        });
      } catch (error: unknown) {
        setDiagnostic({
          severity: "error",
          message: "SQLite database upload failed.",
          detail: errorMessage(error),
        });
      } finally {
        setBusy(false);
      }
    },
    [executeQueryWithDatabase, setActiveDatabase, setBusy, setDiagnostic, setQuery, sqlModule],
  );

  const handleExportResult = React.useCallback(() => {
    if (!queryResult || queryResult.columns.length === 0) {
      return;
    }

    downloadBlob("query-results.csv", new Blob([csvFromSqlResult(queryResult)], { type: "text/csv;charset=utf-8" }));
    setDiagnostic({
      severity: "success",
      message: "Exported query results as CSV.",
    });
  }, [queryResult, setDiagnostic]);

  const handleExportDatabase = React.useCallback(() => {
    if (!database) {
      return;
    }

    const bytes = database.export();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    downloadBlob(databaseDownloadName(databaseName), new Blob([buffer], { type: "application/vnd.sqlite3" }));
    setDiagnostic({
      severity: "success",
      message: "Exported the current SQLite database.",
      detail: `${formatBytes(bytes.byteLength)} generated from the in-memory database.`,
    });
  }, [database, databaseName, setDiagnostic]);

  const runtimeLabel =
    sqlRuntimeState === "ready" ? "Ready" : sqlRuntimeState === "error" ? "Error" : "Loading";
  const resultMeta = queryResult
    ? queryResult.columns.length > 0
      ? `${queryResult.rows.length} rows`
      : "no rows"
    : "not run";

  return (
    <div className={embedded ? "sql-page sql-page-embedded" : "sql-page"}>
      {!embedded ? (
        <section className="sql-hero">
          <div className="hero-copy">
            <p className="eyebrow">SQLite workspace</p>
            <h1>Relational scratchpad</h1>
            <p>
              Create an in-memory SQLite database, bring local CSV or SQLite files into the browser, inspect schemas, and
              export the work you want to keep.
            </p>
          </div>
          <div className="hero-status" aria-label="SQL workspace metrics">
            <Metric label="SQL.js" value={runtimeLabel} />
            <Metric label="Tables" value={String(tables.length)} />
            <Metric label="Result" value={resultMeta} />
          </div>
        </section>
      ) : null}

      <section className="control-panel sql-toolbar" aria-label="SQL workspace actions">
        <div className="panel-header">
          <span>
            <DatabaseIcon size={16} aria-hidden="true" />
            {databaseName}
          </span>
          <small>Browser memory only</small>
        </div>
        <div className="sql-toolbar-actions">
          <button className="secondary-button" disabled={!sqlModule || busy} onClick={handleCreateDatabase} type="button">
            <Plus size={16} aria-hidden="true" />
            New database
          </button>
          <button
            className="secondary-button"
            disabled={!database || busy}
            onClick={() => csvInputRef.current?.click()}
            type="button"
          >
            <Upload size={16} aria-hidden="true" />
            Upload CSV
          </button>
          <button
            className="secondary-button"
            disabled={!sqlModule || busy}
            onClick={() => databaseInputRef.current?.click()}
            type="button"
          >
            <DatabaseIcon size={16} aria-hidden="true" />
            Open SQLite
          </button>
          <button className="secondary-button" disabled={!database || busy} onClick={handleExportDatabase} type="button">
            <Download size={16} aria-hidden="true" />
            Export DB
          </button>
          <input
            accept=".csv,text/csv"
            className="visually-hidden"
            multiple
            onChange={handleCsvUpload}
            ref={csvInputRef}
            type="file"
          />
          <input
            accept=".sqlite,.sqlite3,.db,application/vnd.sqlite3,application/x-sqlite3"
            className="visually-hidden"
            onChange={handleDatabaseUpload}
            ref={databaseInputRef}
            type="file"
          />
        </div>
      </section>

      <SqlDiagnosticBanner diagnostic={diagnostic} />

      <section className="sql-workspace-grid" aria-label="SQL workspace">
        <article className="result-panel sql-schema-panel">
          <div className="panel-header">
            <span>
              <Table2 size={16} aria-hidden="true" />
              Tables
            </span>
            <small>{tables.length}</small>
          </div>
          <SqlTableBrowser tables={tables} selectedTableName={selectedTableName} onSelect={setSelectedTableName} />
        </article>

        <article className="editor-panel sql-query-panel">
          <div className="panel-header">
            <span>
              <DatabaseIcon size={16} aria-hidden="true" />
              query.sql
            </span>
            <button className="primary-button sql-run-button" disabled={!database || busy} onClick={handleRunQuery} type="button">
              <Play size={16} aria-hidden="true" />
              Run
            </button>
          </div>
          <div className="editor-host sql-editor-host">
            <SqlEditor modelUri="inmemory://datafarm/sql/workspace.sql" onChange={setQuery} value={query} />
          </div>
        </article>
      </section>

      <section className="sql-result-grid" aria-label="SQL results and imports">
        <article className="result-panel sql-results-panel">
          <div className="panel-header">
            <span>
              <Rows3 size={16} aria-hidden="true" />
              Query result
            </span>
            <button
              className="secondary-button sql-export-button"
              disabled={!queryResult || queryResult.columns.length === 0}
              onClick={handleExportResult}
              type="button"
            >
              <Download size={16} aria-hidden="true" />
              CSV
            </button>
          </div>
          <SqlResultGrid result={queryResult} />
        </article>

        <article className="result-panel sql-imports-panel">
          <div className="panel-header">
            <span>
              <FileSpreadsheet size={16} aria-hidden="true" />
              Imports
            </span>
            <small>{imports.length}</small>
          </div>
          <ImportList imports={imports} />
        </article>
      </section>
    </div>
  );
}

function SqlDiagnosticBanner({ diagnostic }: { diagnostic: SqlDiagnostic }): React.ReactElement {
  const Icon = diagnostic.severity === "error" ? AlertCircle : CheckCircle2;
  const className = diagnostic.severity === "error" ? "sql-diagnostic sql-diagnostic-error" : "sql-diagnostic";

  return (
    <div className={className} role={diagnostic.severity === "error" ? "alert" : "status"}>
      <Icon size={16} aria-hidden="true" />
      <span>{diagnostic.message}</span>
      {diagnostic.detail ? <small>{diagnostic.detail}</small> : null}
    </div>
  );
}

function ImportList({ imports }: { imports: SqlImportMetadata[] }): React.ReactElement {
  if (imports.length === 0) {
    return <div className="sql-empty-state">No CSV files imported in this database.</div>;
  }

  return (
    <div className="sql-import-list">
      {imports.map((item) => (
        <div className="sql-import-item" key={`${item.importedAt}-${item.tableName}`}>
          <strong>{item.tableName}</strong>
          <span>{item.sourceName}</span>
          <small>
            {item.rowCount} rows / {item.columnCount} columns / {formatImportTime(item.importedAt)}
          </small>
        </div>
      ))}
    </div>
  );
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function databaseDownloadName(name: string): string {
  const baseName = name.replace(/\.(sqlite3?|db)$/i, "") || "datafarm-workspace";
  return `${baseName}.sqlite`;
}

function formatImportTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
