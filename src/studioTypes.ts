import type { AlgrafDiagnostic, AlgrafRenderResult } from "algraf-wasm";
import type { PdlEditorDiagnostic, PdlRunResult } from "pdl-wasm";

export type RuntimeState = "loading" | "ready" | "error";
export type StudioPage = "story" | "interactivity";

export interface DashboardContext {
  time_cutoff: number;
  active_fleet: string;
  selected_zone: string;
  metric_column: string;
  priority_only: boolean;
}

export interface AlgrafEmitPayload {
  type: string;
  field: string;
  value: string;
  markId?: string;
}

export interface InteractivitySnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  selectorResult: AlgrafRenderResult | null;
  receiverResult: AlgrafRenderResult | null;
  error: string | null;
}

export interface StepSnapshot {
  pdlDisplay: PdlRunResult | null;
  pdlCsv: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  error: string | null;
}

export type StepSnapshots = Record<string, StepSnapshot>;
