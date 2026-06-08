// Owns the IDE's Algraf editor source and the derived render snapshot.
//
// Holds: algrafSource (text). Computes an IdeSnapshot that composes the
// upstream PDL preparation snapshot with the Algraf render output. When the
// Algraf runtime is not ready, returns a pdl-only snapshot (no algraf result,
// empty diagnostics). When the active prepared CSV is empty, the Algraf
// renderer is skipped to avoid throwing on missing data files. SQL-mode
// preparation errors are surfaced via the optional preparationError input.

import React from "react";
import type { AlgrafRuntime } from "algraf-wasm";

import { type IdeSnapshot, type PdlPreparationSnapshot } from "../idePdlWorkflow";
import { errorMessage } from "../studioUtils";

const DEFAULT_IDE_ALGRAF_SOURCE = `Chart(
    data: "prepared_series.csv",
    width: 560,
    height: 260,
    title: "Prepared series preview"
) {
    Theme(name: "minimal")
    Scale(fill: segment, label: "Segment")
    Scale(axis: x, type: "categorical")
    Scale(axis: y, domain: [0, 100], breaks: [0, 25, 50, 75, 100])
    Guide(axis: x, label: "Day")
    Guide(axis: y, label: "Value")

    Space(day * value) {
        Bar(fill: segment, tooltip: [day, value, segment], layout: "stack")
        Text(label: value, dy: -8, anchor: "middle", size: 10)
    }
}
`;

export interface IdeAlgrafSnapshotApi {
  algrafSource: string;
  setAlgrafSource: React.Dispatch<React.SetStateAction<string>>;
  snapshot: IdeSnapshot;
}

export function useIdeAlgrafSnapshot(params: {
  algrafRuntime: AlgrafRuntime | null;
  algrafReady: boolean;
  runtimeFiles: Record<string, string>;
  preparedCsv: string;
  pdlPreparation: PdlPreparationSnapshot;
  preparationError: string | null;
}): IdeAlgrafSnapshotApi {
  const { algrafRuntime, algrafReady, runtimeFiles, preparedCsv, pdlPreparation, preparationError } = params;
  const [algrafSource, setAlgrafSource] = React.useState(DEFAULT_IDE_ALGRAF_SOURCE);

  const snapshot = React.useMemo<IdeSnapshot>(() => {
    if (!algrafReady) {
      return {
        pdlResult: pdlPreparation.pdlResult,
        pdlDiagnostics: pdlPreparation.pdlDiagnostics,
        algrafResult: null,
        algrafDiagnostics: [],
        runtimeFiles,
        error: pdlPreparation.error,
      };
    }

    return renderIdeWorkspace(algrafRuntime, algrafSource, runtimeFiles, preparedCsv, pdlPreparation, preparationError);
  }, [algrafReady, algrafRuntime, algrafSource, preparationError, preparedCsv, pdlPreparation, runtimeFiles]);

  return { algrafSource, setAlgrafSource, snapshot };
}

function renderIdeWorkspace(
  algrafRuntime: AlgrafRuntime | null,
  algrafSource: string,
  runtimeFiles: Record<string, string>,
  preparedCsv: string,
  pdlPreparation: PdlPreparationSnapshot,
  preparationError: string | null,
): IdeSnapshot {
  if (!algrafRuntime) {
    return {
      pdlResult: pdlPreparation.pdlResult,
      pdlDiagnostics: pdlPreparation.pdlDiagnostics,
      algrafResult: null,
      algrafDiagnostics: [],
      runtimeFiles,
      error: pdlPreparation.error ?? preparationError,
    };
  }

  try {
    const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, runtimeFiles) : null;
    return {
      pdlResult: pdlPreparation.pdlResult,
      pdlDiagnostics: pdlPreparation.pdlDiagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      runtimeFiles,
      error: pdlPreparation.error ?? preparationError ?? algrafResult?.error ?? null,
    };
  } catch (error: unknown) {
    return {
      pdlResult: pdlPreparation.pdlResult,
      pdlDiagnostics: pdlPreparation.pdlDiagnostics,
      algrafResult: null,
      algrafDiagnostics: [],
      runtimeFiles,
      error: errorMessage(error),
    };
  }
}
