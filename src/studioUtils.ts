import type { AlgrafDiagnostic } from "algraf-wasm";
import type { PdlEditorServiceResult, PdlNamedOutput, PdlRuntimeDiagnostic } from "pdl-wasm";

import type { InteractivitySnapshot, StepSnapshot } from "./studioTypes";

export function pdlRuntimeDiagnosticsForSnapshot(snapshot: StepSnapshot): PdlRuntimeDiagnostic[] {
  return snapshot.pdlDisplay?.diagnostics ?? [];
}

export function diagnosticsForAlgrafEditor(diagnostics: AlgrafDiagnostic[], error: string | null): AlgrafDiagnostic[] {
  if (!error) {
    return diagnostics;
  }

  return [
    ...diagnostics,
    {
      code: "Runtime",
      severity: "error",
      message: error,
      span: { start: 0, end: 0 },
    },
  ];
}

export function emptyEditorResponse(): PdlEditorServiceResult {
  return {
    diagnostics: [],
    result: null,
    error: null,
  };
}

export function emptyInteractivitySnapshot(): InteractivitySnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    selectorResult: null,
    receiverResult: null,
    error: null,
  };
}

export function emptyStepSnapshot(): StepSnapshot {
  return {
    pdlDisplay: null,
    pdlCsv: null,
    pdlDiagnostics: [],
    algrafResult: null,
    algrafDiagnostics: [],
    error: null,
  };
}

export function tableToCsv(output: PdlNamedOutput): string {
  const lines = [output.table.columns, ...output.table.rows].map((row) => row.map(csvCell).join(","));
  return `${lines.join("\n")}\n`;
}

export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function countDataRows(csv: string): number {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  return Math.max(0, lines.length - 1);
}

export function formatBytes(length: number): string {
  if (length < 1024) {
    return `${length} B`;
  }
  if (length < 1024 * 1024) {
    return `${(length / 1024).toFixed(1)} KB`;
  }
  return `${(length / (1024 * 1024)).toFixed(1)} MB`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
