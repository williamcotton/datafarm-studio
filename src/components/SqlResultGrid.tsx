import React from "react";

import { formatSqlValue } from "../sqlWorkspace";
import type { SqlQueryResult } from "../studioTypes";

const RESULT_PREVIEW_LIMIT = 200;

export function SqlResultGrid({ result }: { result: SqlQueryResult | null }): React.ReactElement {
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
