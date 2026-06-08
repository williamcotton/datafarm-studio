// Pure helpers extracted from src/components/IdePage.tsx.
//
// Holds the PDL preparation snapshot type used by the IDE, the empty/normal
// snapshot factory, and the small formatting helpers (runtime label, source
// metadata, time formatter, diagnostic-text composer, snapshot-diagnostics
// flattener). No state, no side effects.

import type { PdlEditorDiagnostic, PdlEditorServiceResult, PdlRunResult, PdlRuntime } from "pdl-wasm";
import type { AlgrafDiagnostic, AlgrafRenderResult } from "algraf-wasm";

import type { RuntimeState, SqlDiagnostic } from "./studioTypes";
import { countDataRows, errorMessage, selectSavedCsvArtifact, type SavedCsvArtifact } from "./studioUtils";

export const IDE_DATA_PATH = "manual_series.csv";
export const IDE_PDL_PATH = "memory/ide/workspace.pdl";
export const IDE_OUTPUT_PATH = "prepared_series.csv";

export type IdeSourceLanguage = "csv" | "json";

export interface PdlPreparationSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  preparedCsv: string;
  preparedArtifact: SavedCsvArtifact | null;
  runtimeFiles: Record<string, string>;
  error: string | null;
}

export interface IdeSnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  runtimeFiles: Record<string, string>;
  error: string | null;
}

export function runPdlPreparation(
  pdlRuntime: PdlRuntime | null,
  sourceFiles: Record<string, string>,
  pdlSource: string,
): PdlPreparationSnapshot {
  if (!pdlRuntime) {
    return emptyPdlPreparationSnapshot(sourceFiles);
  }

  try {
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      sourceFiles,
      { kind: "diagnostics" },
      IDE_PDL_PATH,
    );
    const pdlResult = pdlRuntime.run(pdlSource, sourceFiles, {
      programPath: IDE_PDL_PATH,
    });
    const runtimeFiles: Record<string, string> = {
      ...sourceFiles,
      ...(pdlResult.files ?? {}),
    };
    const preparedArtifact = selectSavedCsvArtifact(pdlResult.files, IDE_OUTPUT_PATH);

    return {
      pdlResult,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      preparedCsv: preparedArtifact?.csv ?? "",
      preparedArtifact,
      runtimeFiles,
      error: pdlEditorResponse.error ?? pdlResult.error ?? null,
    };
  } catch (error: unknown) {
    return {
      ...emptyPdlPreparationSnapshot(sourceFiles),
      error: errorMessage(error),
    };
  }
}

export function emptyPdlPreparationSnapshot(sourceFiles: Record<string, string>): PdlPreparationSnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    preparedCsv: "",
    preparedArtifact: null,
    runtimeFiles: sourceFiles,
    error: null,
  };
}

export function diagnosticMessagesForSnapshot(snapshot: IdeSnapshot, runtimeError: string | null): string[] {
  return [
    ...snapshot.pdlDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...(snapshot.pdlResult?.diagnostics ?? []).map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...snapshot.algrafDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    snapshot.error,
    runtimeError,
  ].filter((message): message is string => Boolean(message));
}

export function diagnosticText(diagnostic: SqlDiagnostic): string {
  return diagnostic.detail ? `${diagnostic.message} ${diagnostic.detail}` : diagnostic.message;
}

export function runtimeLabel(state: RuntimeState): string {
  return state === "ready" ? "Ready" : state === "error" ? "Error" : "Loading";
}

export function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function sourceMetaFor(language: IdeSourceLanguage, source: string, name: string): string {
  if (language === "csv") {
    return `${countDataRows(source)} rows${name !== IDE_DATA_PATH ? ` / ${name}` : ""}`;
  }

  const lineCount = source.trim() ? source.replace(/\n$/, "").split(/\r?\n/).length : 0;
  const label = name.toLowerCase().endsWith(".ljson") ? "LJSON" : "JSON";
  return `${label}${lineCount > 0 ? ` / ${lineCount} lines` : ""}`;
}
