import React from "react";
import { loadAlgrafRuntime, type AlgrafRuntime } from "algraf-wasm";
import { loadPdlRuntime, type PdlRuntime } from "pdl-wasm";

import { HowBuiltPage } from "./components/HowBuiltPage";
import { InteractivityDemoPage } from "./components/InteractivityDemoPage";
import { StoryPage } from "./components/StoryPage";
import { Topbar } from "./components/Topbar";
import {
  DEFAULT_STORY_ID,
  createDefaultRawDataByStory,
  createDefaultSourcesByStory,
  createStoryFiles,
  getStoryBundle,
  type RawDataFile,
  type StoryId,
} from "./storyBundles";
import {
  DEFAULT_DASHBOARD_CONTEXT,
  INTERACTIVITY_DATA,
  INTERACTIVITY_PDL_SOURCE,
  RECEIVER_ALGRAF_SOURCE,
  SELECTOR_ALGRAF_SOURCE,
} from "./interactivityDemoData";
import { publicAssetUrl } from "./publicAssets";
import { runPerStepPrograms, runSharedStoryProgram } from "./storyWorkflow";
import type { AlgrafEmitPayload, RuntimeState, StepSnapshots, StudioPage } from "./studioTypes";
import { emptyStepSnapshot, errorMessage, pdlRuntimeDiagnosticsForSnapshot } from "./studioUtils";

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
  const [dashboardContext, setDashboardContext] = React.useState(DEFAULT_DASHBOARD_CONTEXT);
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

  const handleStoryChange = React.useCallback((nextStoryId: StoryId) => {
    setStoryId(nextStoryId);
    setPage("story");
  }, []);

  const handleRawDataChange = React.useCallback(
    (rawFile: RawDataFile, value: string) => {
      setRawDataByStory((current) => ({
        ...current,
        [activeStory.id]: {
          ...(current[activeStory.id] ?? {}),
          [rawFile.id]: value,
        },
      }));
    },
    [activeStory.id],
  );

  const handlePdlSourceChange = React.useCallback(
    (stepId: string, value: string) => {
      setPdlSourcesByStory((current) => ({
        ...current,
        [activeStory.id]: {
          ...(current[activeStory.id] ?? {}),
          [stepId]: value,
        },
      }));
    },
    [activeStory.id],
  );

  const handleAlgrafSourceChange = React.useCallback(
    (stepId: string, value: string) => {
      setAlgrafSourcesByStory((current) => ({
        ...current,
        [activeStory.id]: {
          ...(current[activeStory.id] ?? {}),
          [stepId]: value,
        },
      }));
    },
    [activeStory.id],
  );

  const handleDemoEmit = React.useCallback((payload: AlgrafEmitPayload) => {
    setLastEmit(payload);
    if (payload.type === "click" && payload.field === "zone") {
      setDashboardContext((current) => ({ ...current, selected_zone: payload.value }));
    }
  }, []);

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
  const brandSubtitle =
    page === "interactivity"
      ? "Reactive PDL and Algraf demo"
      : page === "how-built"
        ? "One slider PDL and Algraf walkthrough"
        : activeStory.brandSubtitle;

  return (
    <div className="studio-shell">
      <Topbar
        activePage={page}
        activeStoryId={activeStory.id}
        algrafState={algrafState}
        brandSubtitle={brandSubtitle}
        homeHref={homeHref}
        onBuildSelect={() => setPage("how-built")}
        onDemoSelect={() => setPage("interactivity")}
        onStoryChange={handleStoryChange}
        pdlState={pdlState}
      />

      <main>
        {page === "how-built" ? (
          <HowBuiltPage
            algrafRuntime={algrafRuntime}
            algrafState={algrafState}
            pdlRuntime={pdlRuntime}
            pdlState={pdlState}
            runtimeError={runtimeError}
          />
        ) : page === "interactivity" ? (
          <InteractivityDemoPage
            algrafRuntime={algrafRuntime}
            algrafState={algrafState}
            context={dashboardContext}
            lastEmit={lastEmit}
            onContextChange={setDashboardContext}
            onDataChange={setInteractivityData}
            onEmit={handleDemoEmit}
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
          <StoryPage
            activeStory={activeStory}
            algrafRuntime={algrafRuntime}
            algrafSources={algrafSources}
            files={files}
            onAlgrafSourceChange={handleAlgrafSourceChange}
            onPdlSourceChange={handlePdlSourceChange}
            onRawDataChange={handleRawDataChange}
            onRunWorkflow={runWorkflow}
            pdlRuntime={pdlRuntime}
            pdlSources={pdlSources}
            rawSources={rawSources}
            runtimeError={runtimeError}
            runtimeReady={runtimeReady}
            running={running}
            snapshots={snapshots}
            totalDiagnostics={totalDiagnostics}
          />
        )}
      </main>
    </div>
  );
}
