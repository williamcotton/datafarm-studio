import type { Database as SqlJsDatabase, SqlJsValue } from "sql.js";

import type { SqlColumnSchema, SqlImportMetadata, SqlQueryResult, SqlTableSchema, SqlValue } from "./studioTypes";
import { csvCell } from "./studioUtils";

export const DEFAULT_SQL_QUERY = `SELECT name, type
FROM sqlite_schema
WHERE type IN ('table', 'view')
ORDER BY name;`;

export function runSqlQuery(database: SqlJsDatabase, query: string): SqlQueryResult {
  const resultSets = database.exec(query);
  const resultSet = resultSets[resultSets.length - 1];

  return {
    columns: resultSet?.columns ?? [],
    rows: (resultSet?.values ?? []).map((row) => row.map(normalizeSqlValue)),
    statementCount: resultSets.length,
    executedAt: Date.now(),
    query,
  };
}

export function listSqlTables(database: SqlJsDatabase): SqlTableSchema[] {
  const result = database.exec(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  )[0];
  const names = (result?.values ?? []).map((row) => String(row[0] ?? "")).filter(Boolean);

  return names.map((name) => ({
    name,
    rowCount: countSqlRows(database, name),
    columns: readSqlTableSchema(database, name),
  }));
}

export function importCsvIntoDatabase(database: SqlJsDatabase, fileName: string, source: string): SqlImportMetadata {
  const rows = parseCsvRows(source);
  if (rows.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const [headerRow, ...dataRows] = rows;
  const width = Math.max(1, headerRow.length, ...dataRows.map((row) => row.length));
  const columns = buildCsvColumnNames(headerRow, width);
  const tableName = uniqueSqlTableName(database, sanitizeSqlName(stripExtension(fileName), "imported_csv"));
  const columnSql = columns.map((column) => `${quoteSqlIdentifier(column)} TEXT`).join(", ");
  const columnList = columns.map(quoteSqlIdentifier).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  let inTransaction = false;
  try {
    database.run("BEGIN TRANSACTION;");
    inTransaction = true;
    database.run(`CREATE TABLE ${quoteSqlIdentifier(tableName)} (${columnSql});`);

    for (const row of dataRows) {
      const values = columns.map((_, index) => row[index] ?? "");
      database.run(`INSERT INTO ${quoteSqlIdentifier(tableName)} (${columnList}) VALUES (${placeholders});`, values);
    }

    database.run("COMMIT;");
    inTransaction = false;
  } catch (error) {
    if (inTransaction) {
      try {
        database.run("ROLLBACK;");
      } catch {
        // Preserve the original import failure.
      }
    }
    try {
      database.run(`DROP TABLE IF EXISTS ${quoteSqlIdentifier(tableName)};`);
    } catch {
      // Preserve the original import failure.
    }
    throw error;
  }

  return {
    sourceName: fileName,
    tableName,
    rowCount: dataRows.length,
    columnCount: columns.length,
    importedAt: new Date().toISOString(),
  };
}

export function selectSqlPreviewQuery(tableName: string): string {
  return `SELECT * FROM ${quoteSqlIdentifier(tableName)} LIMIT 100;`;
}

export function csvFromSqlResult(result: SqlQueryResult): string {
  if (result.columns.length === 0) {
    return "";
  }

  const lines = [
    result.columns,
    ...result.rows.map((row) => result.columns.map((_, index) => sqlValueForCsv(row[index] ?? null))),
  ];
  return `${lines.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function formatSqlValue(value: SqlValue): string {
  if (value === null) {
    return "NULL";
  }
  if (value instanceof Uint8Array) {
    return `[binary ${value.byteLength} bytes]`;
  }
  return String(value);
}

export function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function readSqlTableSchema(database: SqlJsDatabase, tableName: string): SqlColumnSchema[] {
  const result = database.exec(`PRAGMA table_info(${quoteSqlIdentifier(tableName)});`)[0];
  return (result?.values ?? []).map((row) => ({
    name: String(row[1] ?? ""),
    type: String(row[2] ?? ""),
    nullable: Number(row[3] ?? 0) === 0,
    defaultValue: row[4] == null ? null : String(row[4]),
    primaryKey: Number(row[5] ?? 0) > 0,
  }));
}

function countSqlRows(database: SqlJsDatabase, tableName: string): number | null {
  try {
    const result = database.exec(`SELECT COUNT(*) AS row_count FROM ${quoteSqlIdentifier(tableName)};`)[0];
    return Number(result?.values?.[0]?.[0] ?? 0);
  } catch {
    return null;
  }
}

function normalizeSqlValue(value: SqlJsValue): SqlValue {
  return value;
}

function sqlValueForCsv(value: SqlValue): string {
  if (value === null) {
    return "";
  }
  if (value instanceof Uint8Array) {
    return Array.from(value)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return String(value);
}

function parseCsvRows(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
      } else {
        field += char;
      }
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV has an unterminated quoted field.");
  }

  row.push(field);
  if (row.some((cell) => cell.length > 0) || !/[\r\n]$/.test(text)) {
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.length > 0));
}

function buildCsvColumnNames(headerRow: string[], width: number): string[] {
  const used = new Set<string>();
  return Array.from({ length: width }, (_, index) => {
    const base = sanitizeSqlName(headerRow[index] ?? "", `column_${index + 1}`);
    let candidate = base;
    let suffix = 2;

    while (used.has(candidate.toLowerCase())) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }

    used.add(candidate.toLowerCase());
    return candidate;
  });
}

function uniqueSqlTableName(database: SqlJsDatabase, preferredName: string): string {
  const existing = new Set(listSqlTables(database).map((table) => table.name.toLowerCase()));
  let candidate = preferredName;
  let suffix = 2;

  while (existing.has(candidate.toLowerCase())) {
    candidate = `${preferredName}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function sanitizeSqlName(rawName: string, fallback: string): string {
  let name = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!name) {
    name = fallback;
  }
  if (!/^[a-z_]/.test(name)) {
    name = `${fallback}_${name}`;
  }
  return name;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}
