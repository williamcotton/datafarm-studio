import React from "react";
import type { Database as SqlJsDatabase } from "sql.js";

import { SqlTableViewer } from "./SqlTableViewer";

// SQL-mode data panel for the IDE: composes SqlTableViewer to show the active
// SQLite database's tables and previews. The SQL-mode import controls (Open
// SQLite) live in IdePrepPanel's sidebar so that prep-mode switching and the
// table viewer stay independent.
export function IdeSqlPanel({
  database,
  databaseName,
  refreshTrigger,
}: {
  database: SqlJsDatabase | null;
  databaseName: string;
  refreshTrigger: number | null;
}): React.ReactElement {
  return <SqlTableViewer database={database} databaseName={databaseName} refreshTrigger={refreshTrigger} />;
}
