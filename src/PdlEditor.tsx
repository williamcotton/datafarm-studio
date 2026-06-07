import type React from "react";
import { PdlEditor as PackagePdlEditor } from "pdl-editor";
import type { PdlEditorProps, SetupPdlMonacoOptions } from "pdl-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import onigasmWasmUrl from "onigasm/lib/onigasm.wasm?url";

const DATAFARM_PDL_MONACO_SETUP_OPTIONS = {
  createEditorWorker: () => new EditorWorker(),
  onigasmWasmUrl,
} satisfies SetupPdlMonacoOptions;

export function PdlEditor({ setupOptions, ...props }: PdlEditorProps): React.ReactElement {
  return (
    <PackagePdlEditor
      {...props}
      setupOptions={setupOptions ? { ...DATAFARM_PDL_MONACO_SETUP_OPTIONS, ...setupOptions } : DATAFARM_PDL_MONACO_SETUP_OPTIONS}
    />
  );
}
