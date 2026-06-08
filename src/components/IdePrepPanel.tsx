import React from "react";
import { Database, FileUp } from "lucide-react";

import { countDataRows } from "../studioUtils";

type PreparationMode = "pdl" | "sql";

export function IdePrepPanel({
  preparationMode,
  onPreparationModeChange,
  csvInputRef,
  jsonInputRef,
  sqliteInputRef,
  sqliteUploadDisabled,
  onCsvUpload,
  onJsonUpload,
  onSqliteUpload,
  activePreparationLabel,
  activePreparedPath,
  outputCsv,
}: {
  preparationMode: PreparationMode;
  onPreparationModeChange: (next: PreparationMode) => void;
  csvInputRef: React.MutableRefObject<HTMLInputElement | null>;
  jsonInputRef: React.MutableRefObject<HTMLInputElement | null>;
  sqliteInputRef: React.MutableRefObject<HTMLInputElement | null>;
  sqliteUploadDisabled: boolean;
  onCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSqliteUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  activePreparationLabel: string;
  activePreparedPath: string;
  outputCsv: string;
}): React.ReactElement {
  return (
    <aside className="control-panel ide-sidebar-panel" aria-label="IDE preparation controls">
      <div className="ide-sidebar-controls">
        <div className="segmented-control ide-mode-control" aria-label="Preparation mode">
          <button aria-pressed={preparationMode === "pdl"} onClick={() => onPreparationModeChange("pdl")} type="button">
            PDL
          </button>
          <button aria-pressed={preparationMode === "sql"} onClick={() => onPreparationModeChange("sql")} type="button">
            SQL
          </button>
        </div>
        <button className="secondary-button" onClick={() => csvInputRef.current?.click()} type="button">
          <FileUp size={16} aria-hidden="true" />
          Upload CSV
        </button>
        <button className="secondary-button" onClick={() => jsonInputRef.current?.click()} type="button">
          <FileUp size={16} aria-hidden="true" />
          Upload JSON
        </button>
        {preparationMode === "sql" ? (
          <button className="secondary-button" disabled={sqliteUploadDisabled} onClick={() => sqliteInputRef.current?.click()} type="button">
            <Database size={16} aria-hidden="true" />
            Open SQLite
          </button>
        ) : null}
        <input
          accept=".csv,text/csv"
          className="visually-hidden"
          hidden
          onChange={onCsvUpload}
          ref={csvInputRef}
          type="file"
        />
        <input
          accept=".json,.ljson,application/json,application/x-ndjson"
          className="visually-hidden"
          hidden
          onChange={onJsonUpload}
          ref={jsonInputRef}
          type="file"
        />
        <input
          accept=".sqlite,.sqlite3,.db,application/vnd.sqlite3,application/x-sqlite3"
          className="visually-hidden"
          hidden
          onChange={onSqliteUpload}
          ref={sqliteInputRef}
          type="file"
        />
        <div className="ide-artifact-summary">
          <span>
            <strong>Prepare</strong>
            {activePreparationLabel}
          </span>
          <span>
            <strong>Artifact</strong>
            {activePreparedPath}
          </span>
          <span>
            <strong>Rows</strong>
            {countDataRows(outputCsv)}
          </span>
        </div>
      </div>
    </aside>
  );
}
