// Owns PDL and Algraf WASM runtime loading.
//
// Holds: pdlRuntime, algrafRuntime, pdlState, algrafState, runtimeError.
// Consumes: pdl-wasm and algraf-wasm WASM ABIs via their loaders.
// Cleanup: cancellation guard prevents post-unmount state updates if the
// component unmounts before either WASM load resolves.

import React from "react";
import { loadAlgrafRuntime, type AlgrafRuntime } from "algraf-wasm";
import { loadPdlRuntime, type PdlRuntime } from "pdl-wasm";

import { publicAssetUrl } from "../publicAssets";
import type { RuntimeState } from "../studioTypes";
import { errorMessage } from "../studioUtils";

export interface RuntimeInitializer {
  pdlRuntime: PdlRuntime | null;
  algrafRuntime: AlgrafRuntime | null;
  pdlState: RuntimeState;
  algrafState: RuntimeState;
  runtimeError: string | null;
  setRuntimeError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useRuntimeInitializer(): RuntimeInitializer {
  const [pdlRuntime, setPdlRuntime] = React.useState<PdlRuntime | null>(null);
  const [algrafRuntime, setAlgrafRuntime] = React.useState<AlgrafRuntime | null>(null);
  const [pdlState, setPdlState] = React.useState<RuntimeState>("loading");
  const [algrafState, setAlgrafState] = React.useState<RuntimeState>("loading");
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setPdlState("loading");
    setAlgrafState("loading");

    loadPdlRuntime({ wasmUrl: publicAssetUrl("wasm/pdl.wasm") })
      .then((runtime) => {
        if (cancelled) return;
        setPdlRuntime(runtime);
        setPdlState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPdlState("error");
        setRuntimeError(errorMessage(error));
      });

    loadAlgrafRuntime({ wasmUrl: publicAssetUrl("wasm/algraf.wasm") })
      .then((runtime) => {
        if (cancelled) return;
        setAlgrafRuntime(runtime);
        setAlgrafState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAlgrafState("error");
        setRuntimeError(errorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { pdlRuntime, algrafRuntime, pdlState, algrafState, runtimeError, setRuntimeError };
}
