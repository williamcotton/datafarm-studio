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
  MousePointerClick,
  Play,
  Rows3,
  Route,
  Search,
  SlidersHorizontal,
  Table2,
  Workflow,
} from "lucide-react";
import { AlgrafEditor } from "algraf-editor";
import { loadAlgrafRuntime, type AlgrafDiagnostic, type AlgrafRenderResult, type AlgrafRuntime } from "algraf-wasm";
import { PdlEditor, defaultPdlTheme } from "pdl-editor";
import {
  loadPdlRuntime,
  type PdlEditorDiagnostic,
  type PdlEditorServiceResult,
  type PdlContextValue,
  type PdlNamedOutput,
  type PdlRunResult,
  type PdlRuntime,
  type PdlRuntimeDiagnostic,
} from "pdl-wasm";

import { DataEditor } from "./DataEditor";
import { publicAssetUrl } from "./publicAssets";
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

const DATAFARM_EDITOR_THEME_NAME = "datafarm-studio-light";
const DATAFARM_EDITOR_THEME = defaultPdlTheme();

type RuntimeState = "loading" | "ready" | "error";
type StudioPage = "story" | "interactivity";

interface DashboardContext {
  time_cutoff: number;
  active_fleet: string;
  selected_zone: string;
  metric_column: string;
  priority_only: boolean;
}

interface AlgrafEmitPayload {
  type: string;
  field: string;
  value: string;
  markId?: string;
}

interface InteractivitySnapshot {
  pdlResult: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  selectorResult: AlgrafRenderResult | null;
  receiverResult: AlgrafRenderResult | null;
  error: string | null;
}

interface StepSnapshot {
  pdlDisplay: PdlRunResult | null;
  pdlCsv: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  error: string | null;
}

type StepSnapshots = Record<string, StepSnapshot>;

const INTERACTIVITY_PDL_PATH = "memory/interactivity/reactive-dashboard.pdl";
const INTERACTIVITY_DATA_PATH = "reactive_trips.csv";
const ZONE_SUMMARY_PATH = "zone_summary.csv";
const ACTIVE_RANKINGS_PATH = "active_rankings.csv";
const ALGRAF_MARK_SNAP_RADIUS_PX = 44;

const DEFAULT_DASHBOARD_CONTEXT: DashboardContext = {
  time_cutoff: 18,
  active_fleet: "all",
  selected_zone: "Riverfront",
  metric_column: "revenue",
  priority_only: false,
};

const FLEET_OPTIONS = ["all", "bus", "rail", "tram"];
const ZONE_OPTIONS = ["Riverfront", "Market", "Uptown", "Industrial"];
const METRIC_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "duration_min", label: "Duration" },
];

const INTERACTIVITY_DATA = `zone,station,fleet,hour,revenue,duration_min,priority
Riverfront,Pier 1,bus,8,48,12,yes
Riverfront,Harbor,bus,14,64,16,no
Riverfront,Ferry,rail,17,94,28,yes
Riverfront,Boardwalk,tram,20,58,22,no
Market,South Market,bus,9,56,18,yes
Market,East Market,rail,12,86,24,yes
Market,Arcade,tram,16,74,20,no
Market,Depot,bus,19,44,15,no
Uptown,Library,bus,10,42,14,no
Uptown,Museum,rail,15,78,26,yes
Uptown,North Loop,tram,18,66,21,yes
Industrial,Foundry,bus,7,35,11,no
Industrial,Yard,rail,13,61,25,yes
Industrial,Gateway,tram,18,47,17,no
`;

const INTERACTIVITY_PDL_SOURCE = `param time_cutoff = 18
param active_fleet = "all"
param metric_column = "revenue"
param priority_only = false
state selected_zone = "Riverfront"

let trips =
  load "reactive_trips.csv"
  | filter hour <= $time_cutoff
  | filter $active_fleet == "all" or fleet == $active_fleet
  | filter $priority_only == false or priority == "yes"

output zone_summary =
  trips
  | group_by zone
  | agg total_revenue = sum(revenue), trips = count()
  | sort total_revenue desc
  | save "zone_summary.csv"

output active_rankings =
  trips
  | filter zone == @selected_zone
  | group_by station
  | agg total = sum(col($metric_column)), trips = count()
  | sort total desc
  | save "active_rankings.csv"
`;

const SELECTOR_ALGRAF_SOURCE = `Chart(data: "zone_summary.csv", width: 760, height: 420, title: "Zone selector") {
    Theme(name: "minimal")
    Scale(fill: zone, palette: "accent")
    Guide(axis: x, label: "Zone")
    Guide(axis: y, label: "Revenue")

    Space(zone * total_revenue) {
        Bar(fill: zone, layout: "stack", tooltip: [zone, total_revenue, trips])
        On(event: "click", emit: zone)
    }
}
`;

const RECEIVER_ALGRAF_SOURCE = `Chart(data: "active_rankings.csv", width: 760, height: 420, title: "Selected zone stations") {
    Theme(name: "minimal")
    Scale(fill: station, palette: "accent")
    Guide(axis: x, label: "Station")
    Guide(axis: y, label: "Selected metric")

    Space(station * total) {
        Bar(fill: station, layout: "stack", tooltip: [station, total, trips])
    }
}
`;

export function App(): React.ReactElement {
  const [page, setPage] = React.useState<StudioPage>("story");
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
  const [dashboardContext, setDashboardContext] = React.useState<DashboardContext>(DEFAULT_DASHBOARD_CONTEXT);
  const [lastEmit, setLastEmit] = React.useState<AlgrafEmitPayload | null>(null);
  const [interactivityData, setInteractivityData] = React.useState(INTERACTIVITY_DATA);
  const [interactivityPdlSource, setInteractivityPdlSource] = React.useState(INTERACTIVITY_PDL_SOURCE);
  const [selectorAlgrafSource, setSelectorAlgrafSource] = React.useState(SELECTOR_ALGRAF_SOURCE);
  const [receiverAlgrafSource, setReceiverAlgrafSource] = React.useState(RECEIVER_ALGRAF_SOURCE);
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

  React.useEffect(() => {
    setRuntimeError(null);
    setSnapshots({});
    setRunning(false);
  }, [activeStory.id, page]);

  const runWorkflow = React.useCallback(() => {
    if (page !== "story") {
      return;
    }
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
  }, [activeStory, algrafRuntime, algrafSources, files, page, pdlRuntime, pdlSources]);

  React.useEffect(() => {
    if (page !== "story") {
      return;
    }
    if (pdlState !== "ready" || algrafState !== "ready") {
      return;
    }

    const timer = window.setTimeout(runWorkflow, 280);
    return () => window.clearTimeout(timer);
  }, [algrafState, page, pdlState, runWorkflow]);

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
  const brandSubtitle = page === "interactivity" ? "Reactive PDL and Algraf demo" : activeStory.brandSubtitle;

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a className="brand" href={homeHref}>
          <span className="brand-mark">Df</span>
          <span>
            <strong>Datafarm Studio</strong>
            <small>{brandSubtitle}</small>
          </span>
        </a>
        <div className="topbar-controls">
          <StorySwitcher
            activePage={page}
            activeStoryId={activeStory.id}
            onDemoSelect={() => setPage("interactivity")}
            onStoryChange={(nextStoryId) => {
              setStoryId(nextStoryId);
              setPage("story");
            }}
          />
          <div className="runtime-pills" aria-label="Runtime status">
            <RuntimePill label="PDL" state={pdlState} />
            <RuntimePill label="Algraf" state={algrafState} />
          </div>
        </div>
      </header>

      <main>
        {page === "interactivity" ? (
          <InteractivityDemoPage
            algrafRuntime={algrafRuntime}
            algrafState={algrafState}
            context={dashboardContext}
            lastEmit={lastEmit}
            onContextChange={setDashboardContext}
            onDataChange={setInteractivityData}
            onEmit={(payload) => {
              setLastEmit(payload);
              if (payload.type === "click" && payload.field === "zone") {
                setDashboardContext((current) => ({ ...current, selected_zone: payload.value }));
              }
            }}
            onPdlSourceChange={setInteractivityPdlSource}
            onReceiverAlgrafSourceChange={setReceiverAlgrafSource}
            onSelectorAlgrafSourceChange={setSelectorAlgrafSource}
            pdlRuntime={pdlRuntime}
            pdlState={pdlState}
            rawCsv={interactivityData}
            receiverAlgrafSource={receiverAlgrafSource}
            runtimeError={runtimeError}
            selectorAlgrafSource={selectorAlgrafSource}
            source={interactivityPdlSource}
          />
        ) : (
          <>
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
          </>
        )}
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
  activePage,
  activeStoryId,
  onDemoSelect,
  onStoryChange,
}: {
  activePage: StudioPage;
  activeStoryId: StoryId;
  onDemoSelect: () => void;
  onStoryChange: (storyId: StoryId) => void;
}): React.ReactElement {
  return (
    <div className="segmented-control story-switcher" aria-label="Story">
      {STORY_BUNDLES.map((story) => (
        <button
          aria-pressed={activePage === "story" && story.id === activeStoryId}
          key={story.id}
          onClick={() => onStoryChange(story.id)}
          type="button"
        >
          {story.navLabel}
        </button>
      ))}
      <button aria-pressed={activePage === "interactivity"} onClick={onDemoSelect} type="button">
        Interactivity
      </button>
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

function InteractivityDemoPage({
  algrafRuntime,
  algrafState,
  context,
  lastEmit,
  onContextChange,
  onDataChange,
  onEmit,
  onPdlSourceChange,
  onReceiverAlgrafSourceChange,
  onSelectorAlgrafSourceChange,
  pdlRuntime,
  pdlState,
  rawCsv,
  receiverAlgrafSource,
  runtimeError,
  selectorAlgrafSource,
  source,
}: {
  algrafRuntime: AlgrafRuntime | null;
  algrafState: RuntimeState;
  context: DashboardContext;
  lastEmit: AlgrafEmitPayload | null;
  onContextChange: React.Dispatch<React.SetStateAction<DashboardContext>>;
  onDataChange: (value: string) => void;
  onEmit: (payload: AlgrafEmitPayload) => void;
  onPdlSourceChange: (value: string) => void;
  onReceiverAlgrafSourceChange: (value: string) => void;
  onSelectorAlgrafSourceChange: (value: string) => void;
  pdlRuntime: PdlRuntime | null;
  pdlState: RuntimeState;
  rawCsv: string;
  receiverAlgrafSource: string;
  runtimeError: string | null;
  selectorAlgrafSource: string;
  source: string;
}): React.ReactElement {
  const runtimeReady = pdlState === "ready" && algrafState === "ready" && pdlRuntime != null && algrafRuntime != null;
  const snapshot = React.useMemo(() => {
    if (!runtimeReady) {
      return emptyInteractivitySnapshot();
    }
    return runInteractivityDemo(pdlRuntime, algrafRuntime, rawCsv, source, selectorAlgrafSource, receiverAlgrafSource, context);
  }, [algrafRuntime, context, pdlRuntime, rawCsv, receiverAlgrafSource, runtimeReady, selectorAlgrafSource, source]);
  const runtimeFiles = React.useMemo(() => interactivityRuntimeFiles(rawCsv, snapshot.pdlResult), [rawCsv, snapshot.pdlResult]);
  const zoneSummaryCsv = snapshot.pdlResult?.files?.[ZONE_SUMMARY_PATH] ?? "";
  const activeRankingsCsv = snapshot.pdlResult?.files?.[ACTIVE_RANKINGS_PATH] ?? "";
  const diagnosticsCount =
    snapshot.pdlDiagnostics.length +
    (snapshot.pdlResult?.diagnostics.length ?? 0) +
    (snapshot.selectorResult?.diagnostics.length ?? 0) +
    (snapshot.receiverResult?.diagnostics.length ?? 0) +
    (snapshot.error ? 1 : 0);

  return (
    <div className="interactivity-page">
      <section className="demo-hero">
        <div className="hero-copy">
          <p className="eyebrow">Reactive runtime demo</p>
          <h1>PDL context and Algraf events in React</h1>
          <p>
            Host controls update PDL `param` values, Algraf emits a selected zone from sidecar metadata, and Studio
            feeds that `state` back into the next PDL run.
          </p>
        </div>
        <div className="hero-status" aria-label="Interactivity runtime metrics">
          <Metric label="Diagnostics" value={String(diagnosticsCount)} />
          <Metric label="Zone" value={context.selected_zone} />
          <Metric label="Last event" value={lastEmit ? `${lastEmit.type} ${lastEmit.field}=${lastEmit.value}` : "None"} />
        </div>
      </section>

      <section className="demo-controls-section" aria-label="Dashboard controls">
        <article className="control-panel">
          <div className="panel-header">
            <span>
              <SlidersHorizontal size={16} aria-hidden="true" />
              PDL context
            </span>
            <small>{runtimeReady ? "ready" : "loading"}</small>
          </div>
          <div className="control-grid">
            <label className="control-field">
              <span>Time cutoff</span>
              <strong>{context.time_cutoff}:00</strong>
              <input
                min={7}
                max={20}
                onChange={(event) => {
                  const timeCutoff = Number(event.currentTarget.value);
                  onContextChange((current) => ({ ...current, time_cutoff: timeCutoff }));
                }}
                type="range"
                value={context.time_cutoff}
              />
            </label>

            <div className="control-field">
              <span>Fleet</span>
              <div className="segmented-control demo-segmented" aria-label="Fleet">
                {FLEET_OPTIONS.map((fleet) => (
                  <button
                    aria-pressed={context.active_fleet === fleet}
                    key={fleet}
                    onClick={() => onContextChange((current) => ({ ...current, active_fleet: fleet }))}
                    type="button"
                  >
                    {fleet}
                  </button>
                ))}
              </div>
            </div>

            <label className="control-field">
              <span>Metric</span>
              <select
                onChange={(event) => {
                  const metricColumn = event.currentTarget.value;
                  onContextChange((current) => ({ ...current, metric_column: metricColumn }));
                }}
                value={context.metric_column}
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="control-field">
              <span>Selected zone</span>
              <select
                onChange={(event) => {
                  const selectedZone = event.currentTarget.value;
                  onContextChange((current) => ({ ...current, selected_zone: selectedZone }));
                }}
                value={context.selected_zone}
              >
                {ZONE_OPTIONS.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>

            <label className="toggle-field">
              <input
                checked={context.priority_only}
                onChange={(event) => {
                  const priorityOnly = event.currentTarget.checked;
                  onContextChange((current) => ({ ...current, priority_only: priorityOnly }));
                }}
                type="checkbox"
              />
              <span>Priority stops only</span>
            </label>
          </div>
        </article>
      </section>

      <DemoDiagnostics runtimeError={runtimeError} snapshot={snapshot} />

      <section className="demo-chart-grid" aria-label="Reactive charts">
        <DemoChartPanel
          emptyText={snapshot.error ?? runtimeError ?? "No selector chart rendered yet"}
          icon={<MousePointerClick size={16} aria-hidden="true" />}
          onEmit={onEmit}
          result={snapshot.selectorResult}
          title="Selector chart"
        />
        <DemoChartPanel
          emptyText={snapshot.error ?? runtimeError ?? "No dependent chart rendered yet"}
          icon={<BarChart3 size={16} aria-hidden="true" />}
          result={snapshot.receiverResult}
          title={`Stations in ${context.selected_zone}`}
        />
      </section>

      <section className="demo-output-grid" aria-label="Generated PDL files">
        <CsvOutputPanel label={ZONE_SUMMARY_PATH} value={zoneSummaryCsv} />
        <CsvOutputPanel label={ACTIVE_RANKINGS_PATH} value={activeRankingsCsv} />
      </section>

      <section className="demo-source-grid" aria-label="Reactive demo sources">
        <DataPanel
          className="demo-source-panel"
          icon={<Table2 size={16} aria-hidden="true" />}
          label={INTERACTIVITY_DATA_PATH}
          language="csv"
          meta={`${countDataRows(rawCsv)} rows`}
          modelUri="inmemory://datafarm/interactivity/reactive_trips.csv"
          onChange={onDataChange}
          value={rawCsv}
        />

        <article className="editor-panel demo-source-panel">
          <div className="panel-header">
            <span>
              <Workflow size={16} aria-hidden="true" />
              reactive-dashboard.pdl
            </span>
            <small>PDL</small>
          </div>
          <div className="editor-host demo-editor-host">
            <PdlEditor
              diagnostics={snapshot.pdlDiagnostics}
              files={{ [INTERACTIVITY_DATA_PATH]: rawCsv }}
              modelUri={`inmemory://datafarm/${INTERACTIVITY_PDL_PATH.replace(/^memory\/+/, "")}`}
              onChange={onPdlSourceChange}
              runtime={pdlRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={source}
            />
          </div>
        </article>

        <article className="editor-panel demo-source-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              selector.ag
            </span>
            <small>Algraf</small>
          </div>
          <div className="editor-host demo-editor-host">
            <AlgrafEditor
              diagnostics={diagnosticsForAlgrafEditor(snapshot.selectorResult?.diagnostics ?? [], snapshot.selectorResult?.error ?? null)}
              files={runtimeFiles}
              modelUri="inmemory://datafarm/interactivity/selector.ag"
              onChange={onSelectorAlgrafSourceChange}
              runtime={algrafRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={selectorAlgrafSource}
            />
          </div>
        </article>

        <article className="editor-panel demo-source-panel">
          <div className="panel-header">
            <span>
              <BarChart3 size={16} aria-hidden="true" />
              receiver.ag
            </span>
            <small>Algraf</small>
          </div>
          <div className="editor-host demo-editor-host">
            <AlgrafEditor
              diagnostics={diagnosticsForAlgrafEditor(snapshot.receiverResult?.diagnostics ?? [], snapshot.receiverResult?.error ?? null)}
              files={runtimeFiles}
              modelUri="inmemory://datafarm/interactivity/receiver.ag"
              onChange={onReceiverAlgrafSourceChange}
              runtime={algrafRuntime}
              theme={DATAFARM_EDITOR_THEME}
              themeName={DATAFARM_EDITOR_THEME_NAME}
              value={receiverAlgrafSource}
            />
          </div>
        </article>
      </section>
    </div>
  );
}

function DemoChartPanel({
  emptyText,
  icon,
  onEmit,
  result,
  title,
}: {
  emptyText: string;
  icon: React.ReactElement;
  onEmit?: (payload: AlgrafEmitPayload) => void;
  result: AlgrafRenderResult | null;
  title: string;
}): React.ReactElement {
  return (
    <article className="result-panel demo-chart-panel">
      <div className="panel-header">
        <span>
          {icon}
          {title}
        </span>
        <small>{result?.sidecar ? "sidecar" : "svg"}</small>
      </div>
      <InteractiveAlgrafChart emptyText={emptyText} onEmit={onEmit} result={result} />
    </article>
  );
}

function InteractiveAlgrafChart({
  emptyText,
  onEmit,
  result,
}: {
  emptyText: string;
  onEmit?: (payload: AlgrafEmitPayload) => void;
  result: AlgrafRenderResult | null;
}): React.ReactElement {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const sidecar = React.useMemo(() => parseAlgrafSidecar(result?.sidecar ?? null), [result?.sidecar]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onEmit) {
        return;
      }

      const domPayload = algrafEmitFromDomTarget(event.target, "click");
      if (domPayload) {
        onEmit(domPayload);
        return;
      }

      const svg = hostRef.current?.querySelector("svg");
      if (!svg || !sidecar) {
        return;
      }
      const point = svgPointForMouseEvent(svg, event);
      if (!point) {
        return;
      }
      const sidecarPayload = algrafEmitFromNearestMark(sidecar, point.x, point.y, "click");
      if (sidecarPayload) {
        onEmit(sidecarPayload);
      }
    },
    [onEmit, sidecar],
  );

  return (
    <div className="chart-stage demo-chart-stage">
      {result?.svg ? (
        <div
          aria-label="Algraf chart"
          className={`chart-host ${onEmit ? "interactive-chart-host" : ""}`}
          dangerouslySetInnerHTML={{ __html: result.svg }}
          onClick={handleClick}
          ref={hostRef}
        />
      ) : (
        <div className="empty-chart">
          <AlertCircle size={22} aria-hidden="true" />
          {emptyText}
        </div>
      )}
    </div>
  );
}

function CsvOutputPanel({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <article className="result-panel">
      <div className="panel-header">
        <span>
          <Rows3 size={16} aria-hidden="true" />
          {label}
        </span>
        <small>{countDataRows(value)} rows</small>
      </div>
      <pre className="output-block demo-output-block">{value || "Waiting for generated output..."}</pre>
    </article>
  );
}

function DemoDiagnostics({ runtimeError, snapshot }: { runtimeError: string | null; snapshot: InteractivitySnapshot }): React.ReactElement {
  const runtimeDiagnostics = snapshot.pdlResult?.diagnostics ?? [];
  const algrafDiagnostics = [
    ...(snapshot.selectorResult?.diagnostics ?? []),
    ...(snapshot.receiverResult?.diagnostics ?? []),
  ];
  const messages = [
    ...snapshot.pdlDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...runtimeDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    ...algrafDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
    snapshot.error,
    runtimeError,
  ].filter((message): message is string => Boolean(message));

  return (
    <section className={`demo-diagnostics ${messages.length > 0 ? "demo-diagnostics-error" : ""}`} aria-live="polite">
      {messages.length > 0 ? (
        <>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{messages[0]}</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>PDL outputs and Algraf charts are in sync.</span>
        </>
      )}
    </section>
  );
}

function runInteractivityDemo(
  pdlRuntime: PdlRuntime,
  algrafRuntime: AlgrafRuntime,
  rawCsv: string,
  source: string,
  selectorAlgrafSource: string,
  receiverAlgrafSource: string,
  context: DashboardContext,
): InteractivitySnapshot {
  const files = { [INTERACTIVITY_DATA_PATH]: rawCsv };

  try {
    const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
      source,
      files,
      { kind: "diagnostics" },
      INTERACTIVITY_PDL_PATH,
    );
    const pdlResult = pdlRuntime.run(source, files, {
      context: pdlContextValues(context),
      programPath: INTERACTIVITY_PDL_PATH,
    });
    const runtimeFiles = interactivityRuntimeFiles(rawCsv, pdlResult);
    const selectorResult = runtimeFiles[ZONE_SUMMARY_PATH] ? algrafRuntime.render(selectorAlgrafSource, runtimeFiles) : null;
    const receiverResult = runtimeFiles[ACTIVE_RANKINGS_PATH] ? algrafRuntime.render(receiverAlgrafSource, runtimeFiles) : null;

    return {
      pdlResult,
      pdlDiagnostics: pdlEditorResponse.diagnostics,
      selectorResult,
      receiverResult,
      error: pdlEditorResponse.error ?? pdlResult.error ?? selectorResult?.error ?? receiverResult?.error ?? null,
    };
  } catch (error: unknown) {
    return {
      pdlResult: null,
      pdlDiagnostics: [],
      selectorResult: null,
      receiverResult: null,
      error: errorMessage(error),
    };
  }
}

function pdlContextValues(context: DashboardContext): Record<string, PdlContextValue> {
  return {
    active_fleet: context.active_fleet,
    metric_column: context.metric_column,
    priority_only: context.priority_only,
    selected_zone: context.selected_zone,
    time_cutoff: context.time_cutoff,
  };
}

function interactivityRuntimeFiles(rawCsv: string, pdlResult: PdlRunResult | null): Record<string, string> {
  return {
    [INTERACTIVITY_DATA_PATH]: rawCsv,
    ...(pdlResult?.files ?? {}),
  };
}

interface AlgrafSidecar {
  marks?: AlgrafSidecarMark[];
}

interface AlgrafSidecarMark {
  id?: string;
  x_px?: number;
  y_px?: number;
  groups?: Record<string, unknown>;
  interaction?: {
    event?: string;
    emit_field?: string;
  };
}

function parseAlgrafSidecar(sidecar: string | null): AlgrafSidecar | null {
  if (!sidecar) {
    return null;
  }

  try {
    const parsed = JSON.parse(sidecar) as AlgrafSidecar;
    return Array.isArray(parsed.marks) ? parsed : null;
  } catch {
    return null;
  }
}

function algrafEmitFromDomTarget(target: EventTarget | null, eventType: string): AlgrafEmitPayload | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const element = target.closest("[data-algraf-event][data-algraf-emit-field][data-algraf-emit-value]");
  if (!element || element.getAttribute("data-algraf-event") !== eventType) {
    return null;
  }
  const field = element.getAttribute("data-algraf-emit-field");
  const value = element.getAttribute("data-algraf-emit-value");
  if (!field || value == null) {
    return null;
  }
  return {
    type: eventType,
    field,
    value,
  };
}

function svgPointForMouseEvent(svg: SVGSVGElement, event: React.MouseEvent): { x: number; y: number } | null {
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const viewBox = svg.viewBox.baseVal;
  const viewBoxWidth = viewBox?.width || Number(svg.getAttribute("width")) || rect.width;
  const viewBoxHeight = viewBox?.height || Number(svg.getAttribute("height")) || rect.height;
  const viewBoxX = viewBox?.x || 0;
  const viewBoxY = viewBox?.y || 0;

  return {
    x: viewBoxX + ((event.clientX - rect.left) / rect.width) * viewBoxWidth,
    y: viewBoxY + ((event.clientY - rect.top) / rect.height) * viewBoxHeight,
  };
}

function algrafEmitFromNearestMark(sidecar: AlgrafSidecar, x: number, y: number, eventType: string): AlgrafEmitPayload | null {
  let best: { mark: AlgrafSidecarMark; distance: number } | null = null;
  for (const mark of sidecar.marks ?? []) {
    if (mark.interaction?.event !== eventType || typeof mark.x_px !== "number" || typeof mark.y_px !== "number") {
      continue;
    }

    const distance = Math.hypot(mark.x_px - x, mark.y_px - y);
    if (!best || distance < best.distance) {
      best = { mark, distance };
    }
  }

  if (!best || best.distance > ALGRAF_MARK_SNAP_RADIUS_PX) {
    return null;
  }

  const field = best.mark.interaction?.emit_field;
  const rawValue = field ? best.mark.groups?.[field] : null;
  if (!field || rawValue == null) {
    return null;
  }

  return {
    type: eventType,
    field,
    value: String(rawValue),
    markId: best.mark.id,
  };
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

function emptyInteractivitySnapshot(): InteractivitySnapshot {
  return {
    pdlResult: null,
    pdlDiagnostics: [],
    selectorResult: null,
    receiverResult: null,
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
