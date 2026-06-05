declare module "sql.js" {
  export type SqlJsValue = string | number | null | Uint8Array;
  export type SqlJsBindParams = SqlJsValue[] | Record<string, SqlJsValue>;

  export interface QueryExecResult {
    columns: string[];
    values: SqlJsValue[][];
  }

  export interface Database {
    run(sql: string, params?: SqlJsBindParams): Database;
    exec(sql: string, params?: SqlJsBindParams): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: {
      new (data?: Uint8Array): Database;
    };
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
