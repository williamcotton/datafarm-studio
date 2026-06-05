import React from "react";
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
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
import { SqlEditor } from "../SqlEditor";
import { publicAssetUrl } from "../publicAssets";
import {
  DEFAULT_SQL_QUERY,
  csvFromSqlResult,
  formatSqlValue,
  importCsvIntoDatabase,
  listSqlTables,
  runSqlQuery,
  selectSqlPreviewQuery,
} from "../sqlWorkspace";
import type {
  RuntimeState,
  SqlDiagnostic,
  SqlImportMetadata,
  SqlQueryResult,
  SqlTableSchema,
} from "../studioTypes";
import { errorMessage, formatBytes } from "../studioUtils";

const RESULT_PREVIEW_LIMIT = 200;

export function SqlWorkspacePage(): React.ReactElement {
  const [sqlRuntimeState, setSqlRuntimeState] = React.useState<RuntimeState>("loading");
  const [sqlModule, setSqlModule] = React.useState<SqlJsStatic | null>(null);
  const [database, setDatabase] = React.useState<SqlJsDatabase | null>(null);
  const [databaseName, setDatabaseName] = React.useState("Untitled memory database");
  const [query, setQuery] = React.useState(DEFAULT_SQL_QUERY);
  const [queryResult, setQueryResult] = React.useState<SqlQueryResult | null>(null);
  const [tables, setTables] = React.useState<SqlTableSchema[]>([]);
  const [selectedTableName, setSelectedTableName] = React.useState<string | null>(null);
  const [imports, setImports] = React.useState<SqlImportMetadata[]>([]);
  const [diagnostic, setDiagnostic] = React.useState<SqlDiagnostic>({
    severity: "info",
    message: "SQL.js is loading.",
  });
  const [busy, setBusy] = React.useState(false);
  const databaseRef = React.useRef<SqlJsDatabase | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement | null>(null);
  const databaseInputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshTables = React.useCallback((activeDatabase: SqlJsDatabase): SqlTableSchema[] => {
    const nextTables = listSqlTables(activeDatabase);
    setTables(nextTables);
    setSelectedTableName((current) =>
      current && nextTables.some((table) => table.name === current) ? current : (nextTables[0]?.name ?? null),
    );
    return nextTables;
  }, []);

  const setActiveDatabase = React.useCallback(
    (nextDatabase: SqlJsDatabase, nextName: string) => {
      databaseRef.current?.close();
      databaseRef.current = nextDatabase;
      setDatabase(nextDatabase);
      setDatabaseName(nextName);
      refreshTables(nextDatabase);
      setQueryResult(null);
    },
    [refreshTables],
  );

  const executeQueryWithDatabase = React.useCallback(
    (activeDatabase: SqlJsDatabase, nextQuery: string) => {
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
    [refreshTables],
  );

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

        const nextDatabase = new module.Database();
        setActiveDatabase(nextDatabase, "Untitled memory database");
        executeQueryWithDatabase(nextDatabase, DEFAULT_SQL_QUERY);
        setDiagnostic({
          severity: "success",
          message: "SQL.js is ready with a new in-memory database.",
          detail: "The database is browser-local and resets when this page is reloaded.",
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setSqlRuntimeState("error");
        setDiagnostic({
          severity: "error",
          message: "SQL.js failed to load.",
          detail: errorMessage(error),
        });
      });

    return () => {
      cancelled = true;
      databaseRef.current?.close();
      databaseRef.current = null;
    };
  }, [executeQueryWithDatabase, setActiveDatabase]);

  const selectedTable = React.useMemo(
    () => tables.find((table) => table.name === selectedTableName) ?? null,
    [selectedTableName, tables],
  );

  const handleCreateDatabase = React.useCallback(() => {
    if (!sqlModule) {
      return;
    }

    const nextDatabase = new sqlModule.Database();
    setActiveDatabase(nextDatabase, "Untitled memory database");
    setImports([]);
    setQuery(DEFAULT_SQL_QUERY);
    executeQueryWithDatabase(nextDatabase, DEFAULT_SQL_QUERY);
    setDiagnostic({
      severity: "success",
      message: "Created a new in-memory SQLite database.",
      detail: "No filesystem or server persistence is attached.",
    });
  }, [executeQueryWithDatabase, setActiveDatabase, sqlModule]);

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
  }, [database, executeQueryWithDatabase, query]);

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
    [database, executeQueryWithDatabase, refreshTables],
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
    [executeQueryWithDatabase, setActiveDatabase, sqlModule],
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
  }, [queryResult]);

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
  }, [database, databaseName]);

  const runtimeLabel =
    sqlRuntimeState === "ready" ? "Ready" : sqlRuntimeState === "error" ? "Error" : "Loading";
  const resultMeta = queryResult
    ? queryResult.columns.length > 0
      ? `${queryResult.rows.length} rows`
      : "no rows"
    : "not run";

  return (
    <div className="sql-page">
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
          <TableList tables={tables} selectedTableName={selectedTableName} onSelect={setSelectedTableName} />
          <SchemaView table={selectedTable} />
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
          <QueryResultPreview result={queryResult} />
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

function TableList({
  tables,
  selectedTableName,
  onSelect,
}: {
  tables: SqlTableSchema[];
  selectedTableName: string | null;
  onSelect: (tableName: string) => void;
}): React.ReactElement {
  if (tables.length === 0) {
    return <div className="sql-empty-state">No tables in the active database.</div>;
  }

  return (
    <div className="sql-table-list">
      {tables.map((table) => (
        <button
          aria-pressed={table.name === selectedTableName}
          className="sql-table-button"
          key={table.name}
          onClick={() => onSelect(table.name)}
          type="button"
        >
          <strong>{table.name}</strong>
          <small>
            {table.rowCount == null ? "unknown rows" : `${table.rowCount} rows`} / {table.columns.length} columns
          </small>
        </button>
      ))}
    </div>
  );
}

function SchemaView({ table }: { table: SqlTableSchema | null }): React.ReactElement {
  if (!table) {
    return (
      <div className="sql-schema-view">
        <h3>Schema</h3>
        <p>No table selected.</p>
      </div>
    );
  }

  return (
    <div className="sql-schema-view">
      <h3>{table.name} schema</h3>
      <div className="sql-table-scroll">
        <table className="sql-schema-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Null</th>
              <th>Key</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map((column) => (
              <tr key={column.name}>
                <td>{column.name}</td>
                <td>{column.type || "ANY"}</td>
                <td>{column.nullable ? "Yes" : "No"}</td>
                <td>{column.primaryKey ? "PK" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QueryResultPreview({ result }: { result: SqlQueryResult | null }): React.ReactElement {
  if (!result) {
    return <div className="sql-empty-state sql-result-empty">Run a SQL statement to preview results.</div>;
  }

  if (result.columns.length === 0) {
    return <div className="sql-empty-state sql-result-empty">Statement executed without a tabular result.</div>;
  }

  const rows = result.rows.slice(0, RESULT_PREVIEW_LIMIT);

  return (
    <div className="sql-result-preview">
      {result.rows.length > RESULT_PREVIEW_LIMIT ? (
        <div className="sql-result-limit">
          Showing {RESULT_PREVIEW_LIMIT} of {result.rows.length} rows.
        </div>
      ) : null}
      <div className="sql-table-scroll">
        <table className="sql-result-table">
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {result.columns.map((column, columnIndex) => (
                    <td key={`${column}-${columnIndex}`}>{formatSqlValue(row[columnIndex] ?? null)}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={result.columns.length}>No rows returned.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
