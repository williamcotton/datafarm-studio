import React from "react";

import { runtimeLabel } from "../idePdlWorkflow";
import { IDE_DATA_PATH } from "../idePdlWorkflow";
import type { RuntimeState, SqlDiagnostic, SqlImportMetadata, SqlQueryResult } from "../studioTypes";

export function SqlPrepStatus({
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
