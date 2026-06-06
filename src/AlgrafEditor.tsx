import type React from "react";
import { AlgrafEditor as PackageAlgrafEditor } from "algraf-editor";
import type { AlgrafEditorProps, SetupAlgrafMonacoOptions } from "algraf-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import onigasmWasmUrl from "onigasm/lib/onigasm.wasm?url";

const DATAFARM_ALGRAF_MONACO_SETUP_OPTIONS = {
  createEditorWorker: () => new EditorWorker(),
  onigasmWasmUrl,
} satisfies SetupAlgrafMonacoOptions;

export function AlgrafEditor({ setupOptions, ...props }: AlgrafEditorProps): React.ReactElement {
  return (
    <PackageAlgrafEditor
      {...props}
      setupOptions={setupOptions ? { ...DATAFARM_ALGRAF_MONACO_SETUP_OPTIONS, ...setupOptions } : DATAFARM_ALGRAF_MONACO_SETUP_OPTIONS}
    />
  );
}
