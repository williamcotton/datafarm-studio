// Owns the IDE's PDL editor source and the derived PDL preparation snapshot.
//
// Holds: pdlSource (text). Re-runs runPdlPreparation whenever the PDL runtime,
// the inbound sourceFiles map, or the editor source change. When the prep
// mode is not "pdl" or the runtime is not ready, returns the empty snapshot
// for the current sourceFiles. No external lifecycle to clean up; the
// underlying PDL runtime is owned by useRuntimeInitializer.

import React from "react";
import type { PdlRuntime } from "pdl-wasm";

import {
  emptyPdlPreparationSnapshot,
  runPdlPreparation,
  type PdlPreparationSnapshot,
} from "../idePdlWorkflow";

const DEFAULT_IDE_PDL_SOURCE = `output prepared_series =
  load "manual_series.csv"
  | select day, value, segment
  | save "prepared_series.csv"
`;

export interface IdePdlPreparationApi {
  pdlSource: string;
  setPdlSource: React.Dispatch<React.SetStateAction<string>>;
  snapshot: PdlPreparationSnapshot;
  preparedCsv: string;
}

export function useIdePdlPreparation(
  pdlRuntime: PdlRuntime | null,
  sourceFiles: Record<string, string>,
  active: boolean,
): IdePdlPreparationApi {
  const [pdlSource, setPdlSource] = React.useState(DEFAULT_IDE_PDL_SOURCE);
  const pdlReady = active && pdlRuntime != null;

  const snapshot = React.useMemo(() => {
    if (!pdlReady) {
      return emptyPdlPreparationSnapshot(sourceFiles);
    }
    return runPdlPreparation(pdlRuntime, sourceFiles, pdlSource);
  }, [pdlReady, pdlRuntime, pdlSource, sourceFiles]);

  return {
    pdlSource,
    setPdlSource,
    snapshot,
    preparedCsv: snapshot.preparedCsv,
  };
}
