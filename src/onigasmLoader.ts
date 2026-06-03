import { loadWASM } from "onigasm";
import onigasmWasmUrl from "onigasm/lib/onigasm.wasm?url";

let loadPromise: Promise<void> | null = null;

export function loadOnigasmOnce(): Promise<void> {
  loadPromise ??= loadWASM(onigasmWasmUrl).catch((error: unknown) => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}
