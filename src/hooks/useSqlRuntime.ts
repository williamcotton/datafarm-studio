// Owns the SQL.js loader and the active in-memory database for the SQL
// workspace page.
//
// Holds: sqlModule, sqlRuntimeState, database, databaseName, tables, the
// selected table name, the diagnostic banner, and the mutable databaseRef.
// Provides setActiveDatabase (closes the prior database, swaps it in, and
// rereads the table list) and refreshTables.
//
// Cleanup: the active database is closed on unmount via the databaseRef. The
// SQL.js loader uses a cancellation guard. Consumed by useSqlQuery and the
// SqlWorkspacePage layout.

import React from "react";
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";

import { listSqlTables } from "../sqlWorkspace";
import { publicAssetUrl } from "../publicAssets";
import type { RuntimeState, SqlDiagnostic, SqlTableSchema } from "../studioTypes";
import { errorMessage } from "../studioUtils";

export interface SqlRuntimeApi {
  sqlModule: SqlJsStatic | null;
  sqlRuntimeState: RuntimeState;
  database: SqlJsDatabase | null;
  databaseName: string;
  databaseRef: React.MutableRefObject<SqlJsDatabase | null>;
  tables: SqlTableSchema[];
  selectedTableName: string | null;
  setSelectedTableName: React.Dispatch<React.SetStateAction<string | null>>;
  diagnostic: SqlDiagnostic;
  setDiagnostic: React.Dispatch<React.SetStateAction<SqlDiagnostic>>;
  setActiveDatabase: (nextDatabase: SqlJsDatabase, nextName: string) => void;
  refreshTables: (activeDatabase: SqlJsDatabase) => SqlTableSchema[];
}

export function useSqlRuntime(): SqlRuntimeApi {
  const [sqlRuntimeState, setSqlRuntimeState] = React.useState<RuntimeState>("loading");
  const [sqlModule, setSqlModule] = React.useState<SqlJsStatic | null>(null);
  const [database, setDatabase] = React.useState<SqlJsDatabase | null>(null);
  const [databaseName, setDatabaseName] = React.useState("Untitled memory database");
  const [tables, setTables] = React.useState<SqlTableSchema[]>([]);
  const [selectedTableName, setSelectedTableName] = React.useState<string | null>(null);
  const [diagnostic, setDiagnostic] = React.useState<SqlDiagnostic>({
    severity: "info",
    message: "SQL.js is loading.",
  });
  const databaseRef = React.useRef<SqlJsDatabase | null>(null);

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
  }, []);

  return {
    sqlModule,
    sqlRuntimeState,
    database,
    databaseName,
    databaseRef,
    tables,
    selectedTableName,
    setSelectedTableName,
    diagnostic,
    setDiagnostic,
    setActiveDatabase,
    refreshTables,
  };
}
