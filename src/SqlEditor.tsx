import React from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
import "monaco-editor/min/vs/editor/editor.main.css";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "./editorTheme";

let setupDone = false;

export interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  modelUri: string;
}

export function SqlEditor({ value, onChange, modelUri }: SqlEditorProps): React.ReactElement {
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

      model = monaco.editor.createModel(value, "sql", resolvedModelUri);
      editor = monaco.editor.create(hostRef.current, {
        model,
        theme: DATAFARM_EDITOR_THEME_NAME,
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
        wordWrap: "on",
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
  }, [resolvedModelUri]);

  return <div aria-label="SQL query editor" className="sql-editor" ref={hostRef} />;
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

  monaco.editor.defineTheme(DATAFARM_EDITOR_THEME_NAME, DATAFARM_EDITOR_THEME);
  setupDone = true;
}
