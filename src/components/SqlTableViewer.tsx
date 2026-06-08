import React from "react";
import type { Database as SqlJsDatabase } from "sql.js";
import { Database, Table2, Info, Eye, AlertCircle } from "lucide-react";
import type { SqlTableSchema, SqlQueryResult } from "../studioTypes";
import { formatSqlValue, listSqlTables, runSqlQuery, selectSqlPreviewQuery } from "../sqlWorkspace";
import { errorMessage } from "../studioUtils";

interface SqlTableViewerProps {
  database: SqlJsDatabase | null;
  databaseName: string;
  refreshTrigger?: number | null;
}

export function SqlTableViewer({
  database,
  databaseName,
  refreshTrigger,
}: SqlTableViewerProps): React.ReactElement {
  const [tables, setTables] = React.useState<SqlTableSchema[]>([]);
  const [selectedTableName, setSelectedTableName] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"schema" | "preview">("schema");
  const [previewResult, setPreviewResult] = React.useState<SqlQueryResult | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  // Load tables when database changes or refreshTrigger fires
  React.useEffect(() => {
    if (!database) {
      setTables([]);
      setSelectedTableName(null);
      return;
    }

    try {
      const nextTables = listSqlTables(database);
      setTables(nextTables);
      setSelectedTableName((current) => {
        if (current && nextTables.some((t) => t.name === current)) {
          return current;
        }
        return nextTables[0]?.name ?? null;
      });
    } catch (err) {
      console.error("Failed to list SQLite tables", err);
      setTables([]);
      setSelectedTableName(null);
    }
  }, [database, refreshTrigger]);

  // Load preview data when selected table changes
  React.useEffect(() => {
    if (!database || !selectedTableName) {
      setPreviewResult(null);
      setPreviewError(null);
      return;
    }

    try {
      const query = selectSqlPreviewQuery(selectedTableName);
      const result = runSqlQuery(database, query);
      setPreviewResult(result);
      setPreviewError(null);
    } catch (err) {
      setPreviewResult(null);
      setPreviewError(errorMessage(err));
    }
  }, [database, selectedTableName, refreshTrigger]);

  const selectedTable = tables.find((t) => t.name === selectedTableName) ?? null;

  return (
    <article className="editor-panel ide-data-panel sql-viewer-panel">
      <div className="panel-header">
        <span>
          <Database size={16} aria-hidden="true" />
          {databaseName}
        </span>
        <small>
          {tables.length} table{tables.length === 1 ? "" : "s"}
        </small>
      </div>

      <div className="sql-viewer-host">
        {!database ? (
          <div className="sql-viewer-empty">
            <AlertCircle size={22} className="text-muted" aria-hidden="true" />
            <p>SQLite database is not ready.</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="sql-viewer-empty">
            <Table2 size={22} className="text-muted" aria-hidden="true" />
            <p>No tables found in this database.</p>
            <small>Upload a CSV or run a query that creates a table.</small>
          </div>
        ) : (
          <>
            <div className="sql-viewer-controls">
              <div className="sql-viewer-select-wrapper">
                <label htmlFor="sql-table-select" className="visually-hidden">Select Table</label>
                <select
                  id="sql-table-select"
                  value={selectedTableName ?? ""}
                  onChange={(e) => setSelectedTableName(e.target.value)}
                  className="sql-viewer-select"
                >
                  {tables.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.rowCount ?? 0} rows)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sql-viewer-tabs">
                <button
                  type="button"
                  className={`sql-viewer-tab-btn ${activeTab === "schema" ? "active" : ""}`}
                  onClick={() => setActiveTab("schema")}
                >
                  <Info size={14} aria-hidden="true" />
                  Schema
                </button>
                <button
                  type="button"
                  className={`sql-viewer-tab-btn ${activeTab === "preview" ? "active" : ""}`}
                  onClick={() => setActiveTab("preview")}
                >
                  <Eye size={14} aria-hidden="true" />
                  Preview
                </button>
              </div>
            </div>

            <div className="sql-viewer-content">
              {activeTab === "schema" && selectedTable && (
                <div className="sql-viewer-scroll">
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
                      {selectedTable.columns.map((column) => (
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
              )}

              {activeTab === "preview" && (
                <div className="sql-viewer-scroll">
                  {previewError ? (
                    <div className="sql-viewer-error">
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{previewError}</span>
                    </div>
                  ) : !previewResult || previewResult.columns.length === 0 ? (
                    <div className="sql-viewer-empty-preview">No rows returned.</div>
                  ) : (
                    <table className="sql-result-table">
                      <thead>
                        <tr>
                          {previewResult.columns.map((col) => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {previewResult.columns.map((_, colIndex) => (
                              <td key={colIndex}>
                                {formatSqlValue(row[colIndex] ?? null)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
