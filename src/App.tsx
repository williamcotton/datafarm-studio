import React from "react";
import {
  AlertCircle,
  BarChart3,
  Bike,
  CheckCircle2,
  CloudRain,
  GitMerge,
  LoaderCircle,
  MapPinned,
  Play,
  Rows3,
  Route,
  Search,
  Workflow,
} from "lucide-react";

import { AlgrafEditor } from "./AlgrafEditor";
import { DataEditor } from "./DataEditor";
import { PdlEditor } from "./PdlEditor";
import { loadAlgrafRuntime, type AlgrafDiagnostic, type AlgrafRenderResult, type AlgrafRuntime } from "./algrafRuntime";
import {
  DEFAULT_STORY_ID,
  STORY_BUNDLES,
  createDefaultRawDataByStory,
  createDefaultSourcesByStory,
  createStoryFiles,
  getStoryBundle,
  type MethodIcon,
  type RawDataFile,
  type RawDataIcon,
  type StoryBundle,
  type StoryId,
  type StoryStep,
} from "./storyBundles";
import {
  loadPdlRuntime,
  type PdlEditorDiagnostic,
  type PdlEditorServiceResult,
  type PdlNamedOutput,
  type PdlRunResult,
  type PdlRuntime,
  type PdlRuntimeDiagnostic,
} from "./pdlRuntime";

type RuntimeState = "loading" | "ready" | "error";

interface StepSnapshot {
  pdlDisplay: PdlRunResult | null;
  pdlCsv: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  error: string | null;
}

type StepSnapshots = Record<string, StepSnapshot>;

export function App(): React.ReactElement {
  const [storyId, setStoryId] = React.useState<StoryId>(DEFAULT_STORY_ID);
  const [pdlRuntime, setPdlRuntime] = React.useState<PdlRuntime | null>(null);
  const [algrafRuntime, setAlgrafRuntime] = React.useState<AlgrafRuntime | null>(null);
  const [pdlState, setPdlState] = React.useState<RuntimeState>("loading");
  const [algrafState, setAlgrafState] = React.useState<RuntimeState>("loading");
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const [rawDataByStory, setRawDataByStory] = React.useState<Record<StoryId, Record<string, string>>>(() =>
    createDefaultRawDataByStory(),
  );
  const [pdlSourcesByStory, setPdlSourcesByStory] = React.useState<Record<StoryId, Record<string, string>>>(() =>
    createDefaultSourcesByStory("pdl"),
  );
  const [algrafSourcesByStory, setAlgrafSourcesByStory] = React.useState<Record<StoryId, Record<string, string>>>(() =>
    createDefaultSourcesByStory("algraf"),
  );
  const [running, setRunning] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<StepSnapshots>({});

  const activeStory = React.useMemo(() => getStoryBundle(storyId), [storyId]);
  const rawSources = rawDataByStory[activeStory.id] ?? {};
  const pdlSources = pdlSourcesByStory[activeStory.id] ?? {};
  const algrafSources = algrafSourcesByStory[activeStory.id] ?? {};

  const files = React.useMemo(() => createStoryFiles(activeStory, rawSources), [activeStory, rawSources]);

  React.useEffect(() => {
    let cancelled = false;
    setPdlState("loading");
    setAlgrafState("loading");

    loadPdlRuntime()
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

    loadAlgrafRuntime()
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

  React.useEffect(() => {
    setRuntimeError(null);
    setSnapshots({});
    setRunning(false);
  }, [activeStory.id]);

  const runWorkflow = React.useCallback(() => {
    if (!pdlRuntime || !algrafRuntime) {
      return;
    }

    setRunning(true);
    window.setTimeout(() => {
      try {
        const hasPdlEdits = activeStory.steps.some((step) => (pdlSources[step.id] ?? step.pdlSource) !== step.pdlSource);
        const nextSnapshots = hasPdlEdits
          ? runPerStepPrograms(activeStory, pdlRuntime, algrafRuntime, files, pdlSources, algrafSources)
          : runSharedStoryProgram(activeStory, pdlRuntime, algrafRuntime, files, algrafSources);
        setSnapshots(nextSnapshots);
      } catch (error: unknown) {
        setRuntimeError(errorMessage(error));
      } finally {
        setRunning(false);
      }
    }, 0);
  }, [activeStory, algrafRuntime, algrafSources, files, pdlRuntime, pdlSources]);

  React.useEffect(() => {
    if (pdlState !== "ready" || algrafState !== "ready") {
      return;
    }

    const timer = window.setTimeout(runWorkflow, 280);
    return () => window.clearTimeout(timer);
  }, [algrafState, pdlState, runWorkflow]);

  const runtimeReady = pdlState === "ready" && algrafState === "ready";
  const totalDiagnostics = activeStory.steps.reduce((total, step) => {
    const snapshot = snapshots[step.id] ?? emptyStepSnapshot();
    return (
      total +
      snapshot.pdlDiagnostics.length +
      pdlRuntimeDiagnosticsForSnapshot(snapshot).length +
      snapshot.algrafDiagnostics.length +
      (snapshot.error ? 1 : 0)
    );
  }, 0);
  const homeHref = import.meta.env.BASE_URL;

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a className="brand" href={homeHref}>
          <span className="brand-mark">Df</span>
          <span>
            <strong>Datafarm Studio</strong>
            <small>{activeStory.brandSubtitle}</small>
          </span>
        </a>
        <div className="topbar-controls">
          <StorySwitcher activeStoryId={activeStory.id} onChange={setStoryId} />
          <div className="runtime-pills" aria-label="Runtime status">
            <RuntimePill label="PDL" state={pdlState} />
            <RuntimePill label="Algraf" state={algrafState} />
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{activeStory.hero.eyebrow}</p>
            <h1>{activeStory.hero.headline}</h1>
            <p>{activeStory.hero.subhead}</p>
            <div className="hero-actions">
              <button className="primary-button" type="button" disabled={!runtimeReady || running} onClick={runWorkflow}>
                {running ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                Run all sections
              </button>
              <a className="secondary-button" href="#story">
                <Route size={16} aria-hidden="true" />
                Read the story
              </a>
            </div>
            <p className="section-copy">
              PDL editor to Algraf editor to prepared output to rendered chart. Diagnostics now: {totalDiagnostics}.
            </p>
          </div>
          <div className="hero-status" aria-label={activeStory.hero.metricsAriaLabel}>
            {activeStory.hero.metrics.map((metric) => (
              <Metric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </section>

        <section className="step-grid" aria-label="Story method">
          {activeStory.methodSteps.map((step) => (
            <article className="step-card" key={step.title}>
              <div className="step-icon">{methodIcon(step.icon)}</div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </section>

        <section className="case-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{activeStory.rawData.eyebrow}</p>
              <h2>{activeStory.rawData.heading}</h2>
              <p className="section-copy">{activeStory.rawData.copy}</p>
            </div>
          </div>
          <div className="source-grid source-grid-three" aria-label="Raw data files">
            {activeStory.rawData.files.map((rawFile) => {
              const value = rawSources[rawFile.id] ?? rawFile.source;
              return (
                <DataPanel
                  className="raw-panel"
                  icon={rawDataIcon(rawFile.icon)}
                  key={rawFile.id}
                  label={rawFile.label}
                  language={rawFile.language}
                  meta={rawFile.language === "csv" ? `${countDataRows(value)} rows` : `${formatBytes(value.length)}`}
                  value={value}
                  onChange={(nextValue) => updateRawSource(setRawDataByStory, activeStory, rawFile, nextValue)}
                  modelUri={`inmemory://datafarm/${rawFile.modelPath}`}
                />
              );
            })}
          </div>
        </section>

        <section className="story-stack" id="story" aria-label={`${activeStory.navLabel} story`}>
          {activeStory.steps.map((step) => {
            const snapshot = snapshots[step.id] ?? emptyStepSnapshot();
            const preparedCsv = snapshot.pdlCsv?.stdout ?? "";
            const pdlSource = pdlSources[step.id] ?? step.pdlSource;
            const algrafSource = algrafSources[step.id] ?? step.algrafSource;
            const algrafFiles = preparedCsv ? filesWithPreparedOutput(files, step, preparedCsv) : filesWithSupportingFiles(files, step);

            return (
              <StorySection
                algrafDiagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
                algrafFiles={algrafFiles}
                algrafRuntime={algrafRuntime}
                algrafSource={algrafSource}
                key={step.id}
                onAlgrafChange={(value) =>
                  setAlgrafSourcesByStory((current) => ({
                    ...current,
                    [activeStory.id]: {
                      ...current[activeStory.id],
                      [step.id]: value,
                    },
                  }))
                }
                onPdlChange={(value) =>
                  setPdlSourcesByStory((current) => ({
                    ...current,
                    [activeStory.id]: {
                      ...current[activeStory.id],
                      [step.id]: value,
                    },
                  }))
                }
                pdlDiagnostics={snapshot.pdlDiagnostics}
                pdlFiles={files}
                pdlRuntime={pdlRuntime}
                pdlSource={pdlSource}
                runtimeError={runtimeError}
                running={running}
                snapshot={snapshot}
                story={activeStory}
                step={step}
              />
            );
          })}
        </section>

        <section className="guide-section">
          <div>
            <p className="eyebrow">{activeStory.guide.eyebrow}</p>
            <h2>{activeStory.guide.heading}</h2>
          </div>
          <div className="guide-grid">
            {activeStory.guide.items.map((item) => (
              <div key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function runSharedStoryProgram(
  story: StoryBundle,
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  files: Record<string, string>,
  algrafSources: Record<string, string>,
): StepSnapshots {
  const pdlEditorResponses = editorResponsesForSteps(story, pdlRuntime, files, defaultPdlSources(story));
  const storyRun = pdlRuntime.run(story.storyProgramSource, files, { programPath: story.storyProgramPath });
  const outputsByName = new Map(storyRun.outputs.map((output) => [output.name, output]));
  const nextSnapshots: StepSnapshots = {};

  for (const step of story.steps) {
    const output = outputsByName.get(step.outputName) ?? null;
    const pdlCsv = pdlRunResultForSavedFile(storyRun, output, step);
    const preparedCsv = pdlCsv.stdout ?? "";
    const algrafSource = algrafSources[step.id] ?? step.algrafSource;
    const algrafFiles = preparedCsv
      ? filesWithPreparedOutput(files, step, preparedCsv, outputsByName, storyRun.files)
      : filesWithSupportingFiles(files, step);
    const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, algrafFiles) : null;
    const pdlEditorResponse = pdlEditorResponses[step.id] ?? emptyEditorResponse();

    nextSnapshots[step.id] = {
      pdlDisplay: pdlCsv,
      pdlCsv,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      error: pdlEditorResponse.error ?? pdlCsv.error ?? algrafResult?.error ?? null,
    };
  }

  return nextSnapshots;
}

function runPerStepPrograms(
  story: StoryBundle,
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  files: Record<string, string>,
  pdlSources: Record<string, string>,
  algrafSources: Record<string, string>,
): StepSnapshots {
  const nextSnapshots: StepSnapshots = {};

  for (const step of story.steps) {
    const pdlSource = pdlSources[step.id] ?? step.pdlSource;
    const algrafSource = algrafSources[step.id] ?? step.algrafSource;
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      pdlSource,
      files,
      { kind: "diagnostics" },
      step.programPath,
    );
    const pdlCsv = pdlRuntime.run(pdlSource, files, {
      stdoutFormat: "csv",
      programPath: step.programPath,
    });
    const preparedCsv = pdlCsv.stdout ?? "";
    const algrafFiles = preparedCsv ? filesWithPreparedOutput(files, step, preparedCsv, undefined, pdlCsv.files) : filesWithSupportingFiles(files, step);
    const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, algrafFiles) : null;

    nextSnapshots[step.id] = {
      pdlDisplay: pdlCsv,
      pdlCsv,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      algrafResult,
      algrafDiagnostics: algrafResult?.diagnostics ?? [],
      error: pdlEditorResponse.error ?? pdlCsv.error ?? algrafResult?.error ?? null,
    };
  }

  return nextSnapshots;
}

function StorySwitcher({
  activeStoryId,
  onChange,
}: {
  activeStoryId: StoryId;
  onChange: (storyId: StoryId) => void;
}): React.ReactElement {
  return (
    <div className="segmented-control story-switcher" aria-label="Story">
      {STORY_BUNDLES.map((story) => (
        <button
          aria-pressed={story.id === activeStoryId}
          key={story.id}
          onClick={() => onChange(story.id)}
          type="button"
        >
          {story.navLabel}
        </button>
      ))}
    </div>
  );
}

function updateRawSource(
  setRawDataByStory: React.Dispatch<React.SetStateAction<Record<StoryId, Record<string, string>>>>,
  story: StoryBundle,
  rawFile: RawDataFile,
  value: string,
): void {
  setRawDataByStory((current) => ({
    ...current,
    [story.id]: {
      ...current[story.id],
      [rawFile.id]: value,
    },
  }));
}

function methodIcon(icon: MethodIcon): React.ReactElement {
  switch (icon) {
    case "search":
      return <Search size={18} aria-hidden="true" />;
    case "join":
      return <GitMerge size={18} aria-hidden="true" />;
    case "workflow":
      return <Workflow size={18} aria-hidden="true" />;
    case "chart":
      return <BarChart3 size={18} aria-hidden="true" />;
  }
}

function rawDataIcon(icon: RawDataIcon): React.ReactElement {
  switch (icon) {
    case "bike":
      return <Bike size={16} aria-hidden="true" />;
    case "map":
    case "geojson":
      return <MapPinned size={16} aria-hidden="true" />;
    case "weather":
      return <CloudRain size={16} aria-hidden="true" />;
    case "sun":
      return <BarChart3 size={16} aria-hidden="true" />;
    case "seasonal":
      return <Rows3 size={16} aria-hidden="true" />;
  }
}

function RuntimePill({ label, state }: { label: string; state: RuntimeState }): React.ReactElement {
  const icon =
    state === "ready" ? (
      <CheckCircle2 size={14} aria-hidden="true" />
    ) : state === "loading" ? (
      <LoaderCircle className="spin" size={14} aria-hidden="true" />
    ) : (
      <AlertCircle size={14} aria-hidden="true" />
    );

  return (
    <span className={`runtime-pill runtime-pill-${state}`}>
      {icon}
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DataPanel({
  className,
  icon,
  label,
  language,
  meta,
  value,
  onChange,
  modelUri,
}: {
  className: string;
  icon: React.ReactElement;
  label: string;
  language: "csv" | "json";
  meta: string;
  value: string;
  onChange: (value: string) => void;
  modelUri: string;
}): React.ReactElement {
  return (
    <article className={`editor-panel ${className}`}>
      <div className="panel-header">
        <span>
          {icon}
          {label}
        </span>
        <small>{meta}</small>
      </div>
      <div className="editor-host">
        <DataEditor language={language} modelUri={modelUri} onChange={onChange} value={value} />
      </div>
    </article>
  );
}

function StorySection({
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
          <p className="eyebrow">Exploration step</p>
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

function editorResponsesForSteps(
  story: StoryBundle,
  pdlRuntime: PdlRuntime,
  files: Record<string, string>,
  pdlSources: Record<string, string>,
): Record<string, PdlEditorServiceResult> {
  return Object.fromEntries(
    story.steps.map((step) => [
      step.id,
      pdlRuntime.editorService(pdlSources[step.id] ?? step.pdlSource, files, { kind: "diagnostics" }, step.programPath),
    ]),
  );
}

function defaultPdlSources(story: StoryBundle): Record<string, string> {
  return Object.fromEntries(story.steps.map((step) => [step.id, step.pdlSource]));
}

function pdlRunResultForNamedOutput(storyRun: PdlRunResult, output: PdlNamedOutput | null, step: StoryStep): PdlRunResult {
  const missingOutputError = !storyRun.error && !output ? `missing named PDL output \`${step.outputName}\`` : null;
  return {
    stdout: output ? tableToCsv(output) : "",
    files: storyRun.files,
    outputs: output ? [output] : [],
    diagnostics: storyRun.diagnostics,
    error: storyRun.error ?? missingOutputError,
  };
}

function pdlRunResultForSavedFile(storyRun: PdlRunResult, output: PdlNamedOutput | null, step: StoryStep): PdlRunResult {
  const savedFile = storyRun.files?.[step.dataFile];
  if (savedFile != null) {
    return {
      stdout: savedFile,
      files: storyRun.files,
      outputs: output ? [output] : [],
      diagnostics: storyRun.diagnostics,
      error: storyRun.error,
    };
  }

  return pdlRunResultForNamedOutput(storyRun, output, step);
}

function filesWithPreparedOutput(
  files: Record<string, string>,
  step: StoryStep,
  preparedCsv: string,
  outputsByName?: Map<string, PdlNamedOutput>,
  savedFiles?: Record<string, string>,
): Record<string, string> {
  const nextFiles = filesWithSupportingFiles(files, step);
  for (const supportingOutput of step.supportingOutputs ?? []) {
    const savedFile = savedFiles?.[supportingOutput.dataFile];
    const output = outputsByName?.get(supportingOutput.outputName);
    if (savedFile != null) {
      nextFiles[supportingOutput.dataFile] = savedFile;
    } else if (output) {
      nextFiles[supportingOutput.dataFile] = tableToCsv(output);
    }
  }
  return {
    ...nextFiles,
    ...(savedFiles ?? {}),
    "prepared.csv": preparedCsv,
    [step.dataFile]: preparedCsv,
  };
}

function filesWithSupportingFiles(files: Record<string, string>, step: StoryStep): Record<string, string> {
  return {
    ...files,
    ...(step.supportingFiles ?? {}),
  };
}

function modelUriForProgramPath(programPath: string): string {
  return `inmemory://datafarm/${programPath.replace(/^memory\/+/, "")}`;
}

function pdlRuntimeDiagnosticsForSnapshot(snapshot: StepSnapshot): PdlRuntimeDiagnostic[] {
  return snapshot.pdlDisplay?.diagnostics ?? [];
}

function diagnosticsForAlgrafEditor(diagnostics: AlgrafDiagnostic[], error: string | null): AlgrafDiagnostic[] {
  if (!error) {
    return diagnostics;
  }

  return [
    ...diagnostics,
    {
      code: "Runtime",
      severity: "error",
      message: error,
      span: { start: 0, end: 0 },
    },
  ];
}

function emptyEditorResponse(): PdlEditorServiceResult {
  return {
    diagnostics: [],
    result: null,
    error: null,
  };
}

function emptyStepSnapshot(): StepSnapshot {
  return {
    pdlDisplay: null,
    pdlCsv: null,
    pdlDiagnostics: [],
    algrafResult: null,
    algrafDiagnostics: [],
    error: null,
  };
}

function tableToCsv(output: PdlNamedOutput): string {
  const lines = [output.table.columns, ...output.table.rows].map((row) => row.map(csvCell).join(","));
  return `${lines.join("\n")}\n`;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function countDataRows(csv: string): number {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  return Math.max(0, lines.length - 1);
}

function formatBytes(length: number): string {
  if (length < 1024) {
    return `${length} B`;
  }
  if (length < 1024 * 1024) {
    return `${(length / 1024).toFixed(1)} KB`;
  }
  return `${(length / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
