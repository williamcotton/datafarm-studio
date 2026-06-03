import React from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/min/vs/editor/editor.main.css";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

const THEME_NAME = "datafarm-data";

let setupDone = false;

export interface DataEditorProps {
  value: string;
  language: "csv" | "json";
  onChange: (value: string) => void;
  modelUri: string;
}

export function DataEditor({ value, language, onChange, modelUri }: DataEditorProps): React.ReactElement {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = React.useRef<monaco.editor.ITextModel | null>(null);
  const onChangeRef = React.useRef(onChange);
  const resolvedModelUri = React.useMemo(() => monaco.Uri.parse(modelUri), [modelUri]);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    const model = modelRef.current;
    if (model && model.getValue() !== value) {
      const selection = editorRef.current?.getSelection() ?? null;
      model.setValue(value);
      if (selection) {
        editorRef.current?.setSelection(selection);
      }
    }
  }, [value]);

  React.useEffect(() => {
    let cancelled = false;
    let editor: monaco.editor.IStandaloneCodeEditor | null = null;
    let model: monaco.editor.ITextModel | null = null;
    let contentDisposable: monaco.IDisposable | null = null;

    setupMonaco();

    window.setTimeout(() => {
      if (cancelled || !hostRef.current) {
        return;
      }

      model = monaco.editor.createModel(value, language, resolvedModelUri);
      editor = monaco.editor.create(hostRef.current, {
        model,
        theme: THEME_NAME,
        automaticLayout: true,
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
        fontSize: 12,
        lineHeight: 19,
        minimap: { enabled: false },
        overviewRulerBorder: false,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 2,
        wordWrap: "off",
      });

      modelRef.current = model;
      editorRef.current = editor;
      contentDisposable = model.onDidChangeContent(() => {
        onChangeRef.current(model?.getValue() ?? "");
      });
    }, 0);

    return () => {
      cancelled = true;
      contentDisposable?.dispose();
      editor?.dispose();
      model?.dispose();
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
      if (modelRef.current === model) {
        modelRef.current = null;
      }
    };
  }, [language, resolvedModelUri]);

  return <div aria-label="Data source" className="data-editor" ref={hostRef} />;
}

function setupMonaco(): void {
  const target = globalThis as typeof globalThis & {
    MonacoEnvironment?: monaco.Environment;
  };

  target.MonacoEnvironment ??= {
    getWorker: () => new EditorWorker(),
  };

  if (setupDone) {
    return;
  }

  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "number", foreground: "b23b2a" },
      { token: "string", foreground: "7a4a10" },
    ],
    colors: {
      "editor.background": "#fbfcfc",
      "editor.foreground": "#162127",
      "editor.lineHighlightBackground": "#f0f5f3",
      "editorLineNumber.foreground": "#9aa6ac",
      "editorLineNumber.activeForeground": "#21695d",
      "editorCursor.foreground": "#1f6f62",
      "editor.selectionBackground": "#cfe8df",
      "editor.inactiveSelectionBackground": "#e8f2ee",
    },
  });
  setupDone = true;
}
