// Owns the IDE's SQL preparation workspace.
//
// Holds: SQL.js loader state (sqlModule, sqlRuntimeState), the active database
// and its provenance (sqlDatabase, sqlDatabaseName, sqlDatabaseSource), import
// metadata, last query result, prepared CSV and timestamp, busy flag, and the
// SqlDiagnostic banner. Provides handleSqliteUpload, handleRunSql, and
// executeSqlPreparation. The hook re-syncs the SQL.js database from the active
// IDE CSV source whenever sqlDatabaseSource is "ide-source"; when the source
// is JSON or the user uploaded a SQLite file, the IDE-source sync is skipped.
//
// Cleanup: the in-memory database is closed on unmount and closed on replace
// (close-on-replace also applies when re-importing the IDE source CSV). The
// SQL.js loader uses a cancellation guard for unmount during load.

import React from "react";
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";

import { csvFromSqlResult, importCsvIntoDatabase, runSqlQuery } from "../sqlWorkspace";
import { publicAssetUrl } from "../publicAssets";
import type { RuntimeState, SqlDiagnostic, SqlImportMetadata, SqlQueryResult } from "../studioTypes";
import { errorMessage } from "../studioUtils";
import { IDE_DATA_PATH, IDE_OUTPUT_PATH, type IdeSourceLanguage } from "../idePdlWorkflow";

export type SqlDatabaseSource = "ide-source" | "sqlite-upload";

export const DEFAULT_IDE_SQL_SOURCE = `SELECT day, value, segment
FROM manual_series
ORDER BY CAST(day AS INTEGER);`;

export interface SqlWorkspaceApi {
  sqlSource: string;
  setSqlSource: React.Dispatch<React.SetStateAction<string>>;
  sqlModule: SqlJsStatic | null;
  sqlRuntimeState: RuntimeState;
  sqlDatabase: SqlJsDatabase | null;
  sqlDatabaseName: string;
  sqlDatabaseSource: SqlDatabaseSource;
  sqlImport: SqlImportMetadata | null;
  sqlResult: SqlQueryResult | null;
  sqlPreparedCsv: string;
  sqlLastPreparedAt: number | null;
  sqlDiagnostic: SqlDiagnostic;
  sqlBusy: boolean;
  sqliteInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleSqliteUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRunSql: () => void;
  resetToIdeSource: () => void;
}

export function useSqlWorkspace(params: {
  dataSource: string;
  sourceLanguage: IdeSourceLanguage;
  sourceName: string;
}): SqlWorkspaceApi {
  const { dataSource, sourceLanguage, sourceName } = params;

  const [sqlSource, setSqlSource] = React.useState(DEFAULT_IDE_SQL_SOURCE);
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
  const sqliteInputRef = React.useRef<HTMLInputElement | null>(null);
  const sqlDatabaseRef = React.useRef<SqlJsDatabase | null>(null);
  const sqlSourceRef = React.useRef(sqlSource);

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

  const resetToIdeSource = React.useCallback(() => {
    setSqlDatabaseSource("ide-source");
  }, []);

  return {
    sqlSource,
    setSqlSource,
    sqlModule,
    sqlRuntimeState,
    sqlDatabase,
    sqlDatabaseName,
    sqlDatabaseSource,
    sqlImport,
    sqlResult,
    sqlPreparedCsv,
    sqlLastPreparedAt,
    sqlDiagnostic,
    sqlBusy,
    sqliteInputRef,
    handleSqliteUpload,
    handleRunSql,
    resetToIdeSource,
  };
}
