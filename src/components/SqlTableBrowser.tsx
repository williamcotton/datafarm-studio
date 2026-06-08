import React from "react";

import type { SqlTableSchema } from "../studioTypes";

interface SqlTableBrowserProps {
  tables: SqlTableSchema[];
  selectedTableName: string | null;
  onSelect: (tableName: string) => void;
}

export function SqlTableBrowser({ tables, selectedTableName, onSelect }: SqlTableBrowserProps): React.ReactElement {
  const selectedTable = React.useMemo(
    () => tables.find((table) => table.name === selectedTableName) ?? null,
    [selectedTableName, tables],
  );

  return (
    <>
      <TableList tables={tables} selectedTableName={selectedTableName} onSelect={onSelect} />
      <SchemaView table={selectedTable} />
    </>
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
