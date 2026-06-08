// Owns the query string, last query result, and busy flag for the SQL
// workspace page.
//
// Provides setQuery, setQueryResult, busy/setBusy. Execution itself is
// delegated to the page (which composes useSqlRuntime + this hook and
// coordinates result-and-diagnostic side effects).

import React from "react";

import { DEFAULT_SQL_QUERY } from "../sqlWorkspace";
import type { SqlQueryResult } from "../studioTypes";

export interface SqlQueryApi {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  queryResult: SqlQueryResult | null;
  setQueryResult: React.Dispatch<React.SetStateAction<SqlQueryResult | null>>;
  busy: boolean;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useSqlQuery(): SqlQueryApi {
  const [query, setQuery] = React.useState(DEFAULT_SQL_QUERY);
  const [queryResult, setQueryResult] = React.useState<SqlQueryResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  return { query, setQuery, queryResult, setQueryResult, busy, setBusy };
}
