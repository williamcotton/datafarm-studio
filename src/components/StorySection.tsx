import type React from "react";
import type { AlgrafDiagnostic, AlgrafRuntime } from "algraf-wasm";
import { AlertCircle, BarChart3, CheckCircle2, LoaderCircle, Rows3, Workflow } from "lucide-react";
import type { PdlEditorDiagnostic, PdlRuntime } from "pdl-wasm";

import { AlgrafEditor } from "../AlgrafEditor";
import { PdlEditor } from "../PdlEditor";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import { modelUriForProgramPath } from "../storyWorkflow";
import type { StoryBundle, StoryStep } from "../storyBundles";
import type { StepSnapshot } from "../studioTypes";
import { countDataRows } from "../studioUtils";

export function StorySection({
  story,
  step,
  pdlSource,
  algrafSource,
  pdlFiles,
  algrafFiles,
  pdlRuntime,
  algrafRuntime,
  pdlDiagnostics,
  algrafDiagnostics,
  snapshot,
  runtimeError,
  running,
  onPdlChange,
  onAlgrafChange,
}: {
  story: StoryBundle;
  step: StoryStep;
  pdlSource: string;
  algrafSource: string;
  pdlFiles: Record<string, string>;
  algrafFiles: Record<string, string>;
  pdlRuntime: PdlRuntime | null;
  algrafRuntime: AlgrafRuntime | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafDiagnostics: AlgrafDiagnostic[];
  snapshot: StepSnapshot;
  runtimeError: string | null;
  running: boolean;
  onPdlChange: (value: string) => void;
  onAlgrafChange: (value: string) => void;
}): React.ReactElement {
  const preparedOutput = snapshot.pdlDisplay?.stdout ?? "";
  const preparedRows = countDataRows(preparedOutput);

  return (
    <article className="story-section">
      <div className="story-section-header">
        <div className="story-number">{step.number}</div>
        <div>
          <p className="eyebrow">Analysis step</p>
          <h2>{step.title}</h2>
          <p>{step.question}</p>
        </div>
        <StatusLine running={running} snapshot={snapshot} />
      </div>

      <p className="story-summary">{step.summary}</p>

      <div className="fourfold-grid">
        <article className="editor-panel fold-panel">
          <div className="panel-header">
            <span>
              <Workflow size={16} aria-hidden="true" />
              {step.pdlLabel}
            </span>
            <small>PDL</small>
          </div>
          <div className="editor-host story-editor-host">
            <PdlEditor
              diagnostics={pdlDiagnostics}
              files={pdlFiles}
              modelUri={modelUriForProgramPath(step.programPath)}
              onChange={onPdlChange}
              runtime={pdlRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={pdlSource}
            />
          </div>
        </article>

        <article className="editor-panel fold-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              {step.algrafLabel}
            </span>
            <small>Algraf</small>
          </div>
          <div className="editor-host story-editor-host">
            <AlgrafEditor
              diagnostics={algrafDiagnostics}
              files={algrafFiles}
              modelUri={`inmemory://datafarm/${story.slug}/${step.number}/${step.algrafLabel}`}
              onChange={onAlgrafChange}
              runtime={algrafRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={algrafSource}
            />
          </div>
        </article>

        <article className="result-panel fold-panel">
          <div className="panel-header">
            <span>
              <Rows3 size={16} aria-hidden="true" />
              {step.dataFile}
            </span>
            <small>{preparedRows} rows, CSV</small>
          </div>
          <pre className="output-block">{preparedOutput || runtimeError || "Waiting for the browser runtimes..."}</pre>
        </article>

        <article className="result-panel fold-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              Rendered chart
            </span>
          </div>
          <div className="chart-stage">
            {snapshot.algrafResult?.svg ? (
              <div className="chart-host" dangerouslySetInnerHTML={{ __html: snapshot.algrafResult.svg }} />
            ) : (
              <div className="empty-chart">
                <AlertCircle size={22} aria-hidden="true" />
                {snapshot.error ?? runtimeError ?? "No chart rendered yet"}
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="story-conclusion">
        <div>
          <h3>Conclusion</h3>
          <p>{step.conclusion}</p>
        </div>
        <ul className="evidence-list">
          {step.evidence.map((item) => (
            <li key={item}>
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function StatusLine({ running, snapshot }: { running: boolean; snapshot: StepSnapshot }): React.ReactElement {
  if (running) {
    return (
      <small className="status-text">
        <LoaderCircle className="spin" size={14} aria-hidden="true" />
        Running
      </small>
    );
  }

  if (snapshot.error) {
    return (
      <small className="status-text status-error">
        <AlertCircle size={14} aria-hidden="true" />
        Error
      </small>
    );
  }

  return (
    <small className="status-text">
      <CheckCircle2 size={14} aria-hidden="true" />
      Ready
    </small>
  );
}
