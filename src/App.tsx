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
  HERO_METRICS,
  RAW_DATA,
  STORY_PROGRAM_PATH,
  STORY_PROGRAM_SOURCE,
  STORY_STEPS,
  createBikeShareFiles,
  type StoryStep,
} from "./bikeShareStory";
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

const INTAKE_STEPS = [
  {
    icon: <Search size={18} aria-hidden="true" />,
    title: "One question per table",
    body: "Each section prepares the smallest CSV its chart needs, so the claim can be audited without extra baggage.",
  },
  {
    icon: <GitMerge size={18} aria-hidden="true" />,
    title: "Context joins late",
    body: "Stations and weather join only when the story asks for them, after trip counts have exposed the first misread.",
  },
  {
    icon: <Workflow size={18} aria-hidden="true" />,
    title: "Named outputs drive charts",
    body: "The default run executes one PDL story program and routes each named output to its matching Algraf file.",
  },
  {
    icon: <BarChart3 size={18} aria-hidden="true" />,
    title: "Chart form carries the argument",
    body: "Area, scatter, slope, grouped bars, and ranked bars each match a different step in the decision.",
  },
];

export function App(): React.ReactElement {
  const [pdlRuntime, setPdlRuntime] = React.useState<PdlRuntime | null>(null);
  const [algrafRuntime, setAlgrafRuntime] = React.useState<AlgrafRuntime | null>(null);
  const [pdlState, setPdlState] = React.useState<RuntimeState>("loading");
  const [algrafState, setAlgrafState] = React.useState<RuntimeState>("loading");
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const [tripsCsv, setTripsCsv] = React.useState(RAW_DATA.trips);
  const [stationsCsv, setStationsCsv] = React.useState(RAW_DATA.stations);
  const [weatherCsv, setWeatherCsv] = React.useState(RAW_DATA.weather);
  const [pdlSources, setPdlSources] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(STORY_STEPS.map((step) => [step.id, step.pdlSource])),
  );
  const [algrafSources, setAlgrafSources] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(STORY_STEPS.map((step) => [step.id, step.algrafSource])),
  );
  const [running, setRunning] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<StepSnapshots>({});

  const files = React.useMemo(
    () => createBikeShareFiles(tripsCsv, stationsCsv, weatherCsv),
    [stationsCsv, tripsCsv, weatherCsv],
  );

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

  const runWorkflow = React.useCallback(() => {
    if (!pdlRuntime || !algrafRuntime) {
      return;
    }

    setRunning(true);
    window.setTimeout(() => {
      try {
        const hasPdlEdits = STORY_STEPS.some((step) => (pdlSources[step.id] ?? step.pdlSource) !== step.pdlSource);
        const nextSnapshots = hasPdlEdits
          ? runPerStepPrograms(pdlRuntime, algrafRuntime, files, pdlSources, algrafSources)
          : runSharedStoryProgram(pdlRuntime, algrafRuntime, files, algrafSources);
        setSnapshots(nextSnapshots);
      } catch (error: unknown) {
        setRuntimeError(errorMessage(error));
      } finally {
        setRunning(false);
      }
    }, 0);
  }, [algrafRuntime, algrafSources, files, pdlRuntime, pdlSources]);

  React.useEffect(() => {
    if (pdlState !== "ready" || algrafState !== "ready") {
      return;
    }

    const timer = window.setTimeout(runWorkflow, 280);
    return () => window.clearTimeout(timer);
  }, [algrafState, pdlState, runWorkflow]);

  const runtimeReady = pdlState === "ready" && algrafState === "ready";
  const totalDiagnostics = STORY_STEPS.reduce((total, step) => {
    const snapshot = snapshots[step.id] ?? emptyStepSnapshot();
    return (
      total +
      snapshot.pdlDiagnostics.length +
      pdlRuntimeDiagnosticsForSnapshot(snapshot).length +
      snapshot.algrafDiagnostics.length +
      (snapshot.error ? 1 : 0)
    );
  }, 0);

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">Df</span>
          <span>
            <strong>Datafarm Studio</strong>
            <small>Urban bike-share story</small>
          </span>
        </a>
        <div className="runtime-pills" aria-label="Runtime status">
          <RuntimePill label="PDL" state={pdlState} />
          <RuntimePill label="Algraf" state={algrafState} />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Urban bike-share case study</p>
            <h1>Two-thirds of the rides. Less than two-fifths of the money.</h1>
            <p>
              Forty-seven valid April rides, built up one table and one chart at a time. We begin with
              the trip counts an operator already watches, then add station and weather context only
              when a question forces it.
            </p>
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
          <div className="hero-status" aria-label="Bike-share headline metrics">
            {HERO_METRICS.map((metric) => (
              <Metric key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </section>

        <section className="step-grid" aria-label="Story method">
          {INTAKE_STEPS.map((step) => (
            <article className="step-card" key={step.title}>
              <div className="step-icon">{step.icon}</div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </section>

        <section className="case-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Raw data</p>
              <h2>Three sources, joined on purpose</h2>
              <p className="section-copy">
                The trip export carries 49 rows: 47 completed rides plus one cancelled and one
                maintenance row. Stations and weather stay separate until a section needs them.
              </p>
            </div>
          </div>
          <div className="source-grid source-grid-three" aria-label="Raw data files">
            <DataPanel
              className="raw-panel"
              icon={<Bike size={16} aria-hidden="true" />}
              label="trips_raw.csv"
              meta={`${countDataRows(tripsCsv)} rows`}
              value={tripsCsv}
              onChange={setTripsCsv}
              modelUri="inmemory://datafarm/datafarm-bikeshare/data/trips_raw.csv"
            />
            <DataPanel
              className="raw-panel"
              icon={<MapPinned size={16} aria-hidden="true" />}
              label="stations.csv"
              meta={`${countDataRows(stationsCsv)} rows`}
              value={stationsCsv}
              onChange={setStationsCsv}
              modelUri="inmemory://datafarm/datafarm-bikeshare/data/stations.csv"
            />
            <DataPanel
              className="raw-panel"
              icon={<CloudRain size={16} aria-hidden="true" />}
              label="weather_daily.csv"
              meta={`${countDataRows(weatherCsv)} rows`}
              value={weatherCsv}
              onChange={setWeatherCsv}
              modelUri="inmemory://datafarm/datafarm-bikeshare/data/weather_daily.csv"
            />
          </div>
        </section>

        <section className="story-stack" id="story" aria-label="Bike-share story">
          {STORY_STEPS.map((step) => {
            const snapshot = snapshots[step.id] ?? emptyStepSnapshot();
            const preparedCsv = snapshot.pdlCsv?.stdout ?? "";
            const pdlSource = pdlSources[step.id] ?? step.pdlSource;
            const algrafSource = algrafSources[step.id] ?? step.algrafSource;
            const algrafFiles = preparedCsv ? filesWithPreparedOutput(files, step, preparedCsv) : files;

            return (
              <StorySection
                algrafDiagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
                algrafFiles={algrafFiles}
                algrafRuntime={algrafRuntime}
                algrafSource={algrafSource}
                key={step.id}
                onAlgrafChange={(value) =>
                  setAlgrafSources((current) => ({
                    ...current,
                    [step.id]: value,
                  }))
                }
                onPdlChange={(value) =>
                  setPdlSources((current) => ({
                    ...current,
                    [step.id]: value,
                  }))
                }
                pdlDiagnostics={snapshot.pdlDiagnostics}
                pdlFiles={files}
                pdlRuntime={pdlRuntime}
                pdlSource={pdlSource}
                runtimeError={runtimeError}
                running={running}
                snapshot={snapshot}
                step={step}
              />
            );
          })}
        </section>

        <section className="guide-section">
          <div>
            <p className="eyebrow">Payoff</p>
            <h2>Busy is not the same as valuable</h2>
          </div>
          <div className="guide-grid">
            <div>
              <h3>Counts mislead</h3>
              <p>Member rides dominate the dashboard, but visitor rides carry most of the money.</p>
            </div>
            <div>
              <h3>Revenue is exposed</h3>
              <p>The high-value segment is weather-shy, so rainy days cut revenue harder than trip count.</p>
            </div>
            <div>
              <h3>Docks become decisions</h3>
              <p>The ranked output identifies the small stations where a missing bike costs the most.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function runSharedStoryProgram(
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  files: Record<string, string>,
  algrafSources: Record<string, string>,
): StepSnapshots {
  const pdlEditorResponses = editorResponsesForSteps(pdlRuntime, files, defaultPdlSources());
  const storyRun = pdlRuntime.run(STORY_PROGRAM_SOURCE, files, { programPath: STORY_PROGRAM_PATH });
  const outputsByName = new Map(storyRun.outputs.map((output) => [output.name, output]));
  const nextSnapshots: StepSnapshots = {};

  for (const step of STORY_STEPS) {
    const output = outputsByName.get(step.outputName) ?? null;
    const pdlCsv = pdlRunResultForNamedOutput(storyRun, output, step);
    const preparedCsv = pdlCsv.stdout ?? "";
    const algrafSource = algrafSources[step.id] ?? step.algrafSource;
    const algrafFiles = preparedCsv ? filesWithPreparedOutput(files, step, preparedCsv) : files;
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
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  files: Record<string, string>,
  pdlSources: Record<string, string>,
  algrafSources: Record<string, string>,
): StepSnapshots {
  const nextSnapshots: StepSnapshots = {};

  for (const step of STORY_STEPS) {
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
    const algrafFiles = preparedCsv ? filesWithPreparedOutput(files, step, preparedCsv) : files;
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
  meta,
  value,
  onChange,
  modelUri,
}: {
  className: string;
  icon: React.ReactElement;
  label: string;
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
        <DataEditor language="csv" modelUri={modelUri} onChange={onChange} value={value} />
      </div>
    </article>
  );
}

function StorySection({
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
              modelUri={`inmemory://datafarm/datafarm-bikeshare/${step.number}/${step.algrafLabel}`}
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
  pdlRuntime: PdlRuntime,
  files: Record<string, string>,
  pdlSources: Record<string, string>,
): Record<string, PdlEditorServiceResult> {
  return Object.fromEntries(
    STORY_STEPS.map((step) => [
      step.id,
      pdlRuntime.editorService(pdlSources[step.id] ?? step.pdlSource, files, { kind: "diagnostics" }, step.programPath),
    ]),
  );
}

function defaultPdlSources(): Record<string, string> {
  return Object.fromEntries(STORY_STEPS.map((step) => [step.id, step.pdlSource]));
}

function pdlRunResultForNamedOutput(storyRun: PdlRunResult, output: PdlNamedOutput | null, step: StoryStep): PdlRunResult {
  const missingOutputError = !storyRun.error && !output ? `missing named PDL output \`${step.outputName}\`` : null;
  return {
    stdout: output ? tableToCsv(output) : "",
    outputs: output ? [output] : [],
    diagnostics: storyRun.diagnostics,
    error: storyRun.error ?? missingOutputError,
  };
}

function filesWithPreparedOutput(files: Record<string, string>, step: StoryStep, preparedCsv: string): Record<string, string> {
  return {
    ...files,
    "prepared.csv": preparedCsv,
    [step.dataFile]: preparedCsv,
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
