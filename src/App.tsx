import React from "react";

import { CaseStudiesIndexPage, CaseStudyNav } from "./components/CaseStudiesPage";
import { DocsHeader, DocsPage } from "./components/DocsPage";
import { HowBuiltPage } from "./components/HowBuiltPage";
import { IdePage } from "./components/IdePage";
import { InteractivityDemoPage } from "./components/InteractivityDemoPage";
import { LandingPage } from "./components/LandingPage";
import { StoryPage } from "./components/StoryPage";
import { Topbar } from "./components/Topbar";
import { useInteractivityDashboard } from "./hooks/useInteractivityDashboard";
import { useRuntimeInitializer } from "./hooks/useRuntimeInitializer";
import { useStoryState } from "./hooks/useStoryState";
import { useStudioRouter } from "./hooks/useStudioRouter";
import {
  DEFAULT_STORY_ID,
  createStoryFiles,
  getStoryBundle,
} from "./storyBundles";
import type { StudioRoute } from "./router";
import {
  INTERACTIVITY_DATA,
  INTERACTIVITY_PDL_SOURCE,
  RECEIVER_ALGRAF_SOURCE,
  SELECTOR_ALGRAF_SOURCE,
} from "./interactivityDemoData";
import { runPerStepPrograms, runSharedStoryProgram } from "./storyWorkflow";
import type { StepSnapshots, StudioPage } from "./studioTypes";
import { emptyStepSnapshot, errorMessage, pdlRuntimeDiagnosticsForSnapshot } from "./studioUtils";

export function App(): React.ReactElement {
  const { route, navigate } = useStudioRouter();
  const { pdlRuntime, algrafRuntime, pdlState, algrafState, runtimeError, setRuntimeError } = useRuntimeInitializer();

  const activePage: StudioPage = route.page;
  const storyId = route.storyId ?? DEFAULT_STORY_ID;
  const activeStory = React.useMemo(() => getStoryBundle(storyId), [storyId]);

  const {
    rawDataByStory,
    pdlSourcesByStory,
    algrafSourcesByStory,
    handleRawDataChange,
    handlePdlSourceChange,
    handleAlgrafSourceChange,
  } = useStoryState(activeStory.id);

  const { dashboardContext, lastEmit, onContextChange, onEmit } = useInteractivityDashboard();
  const [interactivityData, setInteractivityData] = React.useState(INTERACTIVITY_DATA);
  const [interactivityPdlSource, setInteractivityPdlSource] = React.useState(INTERACTIVITY_PDL_SOURCE);
  const [selectorAlgrafSource, setSelectorAlgrafSource] = React.useState(SELECTOR_ALGRAF_SOURCE);
  const [receiverAlgrafSource, setReceiverAlgrafSource] = React.useState(RECEIVER_ALGRAF_SOURCE);
  const [running, setRunning] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<StepSnapshots>({});

  const rawSources = rawDataByStory[activeStory.id] ?? {};
  const pdlSources = pdlSourcesByStory[activeStory.id] ?? {};
  const algrafSources = algrafSourcesByStory[activeStory.id] ?? {};
  const files = React.useMemo(() => createStoryFiles(activeStory, rawSources), [activeStory, rawSources]);

  React.useEffect(() => {
    setRuntimeError(null);
    setSnapshots({});
    setRunning(false);
  }, [activePage, activeStory.id, setRuntimeError]);

  const runWorkflow = React.useCallback(() => {
    if (activePage !== "case-study") {
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
  }, [activePage, activeStory, algrafRuntime, algrafSources, files, pdlRuntime, pdlSources, setRuntimeError]);

  React.useEffect(() => {
    if (activePage !== "case-study") {
      return;
    }
    if (pdlState !== "ready" || algrafState !== "ready") {
      return;
    }

    const timer = window.setTimeout(runWorkflow, 280);
    return () => window.clearTimeout(timer);
  }, [activePage, algrafState, pdlState, runWorkflow]);

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
  const brandSubtitle = brandSubtitleForRoute(route, activeStory.brandSubtitle);

  return (
    <div className="studio-shell">
      <Topbar
        activePage={activePage}
        algrafState={algrafState}
        brandSubtitle={brandSubtitle}
        onNavigate={navigate}
        pdlState={pdlState}
      />

      <main className={activePage === "ide" ? "studio-main studio-main-ide" : "studio-main"}>
        {activePage === "landing" ? (
          <LandingPage
            algrafRuntime={algrafRuntime}
            algrafState={algrafState}
            onNavigate={navigate}
            pdlRuntime={pdlRuntime}
            pdlState={pdlState}
            runtimeError={runtimeError}
          />
        ) : activePage === "ide" ? (
          <IdePage
            algrafRuntime={algrafRuntime}
            algrafState={algrafState}
            pdlRuntime={pdlRuntime}
            pdlState={pdlState}
            runtimeError={runtimeError}
          />
        ) : activePage === "case-studies" ? (
          <CaseStudiesIndexPage onNavigate={navigate} />
        ) : activePage === "docs" ? (
          <DocsPage onNavigate={navigate} />
        ) : activePage === "docs-how-built" ? (
          <>
            <DocsHeader onNavigate={navigate} />
            <HowBuiltPage
              algrafRuntime={algrafRuntime}
              algrafState={algrafState}
              pdlRuntime={pdlRuntime}
              pdlState={pdlState}
              runtimeError={runtimeError}
            />
          </>
        ) : activePage === "labs-interactivity" ? (
          <InteractivityDemoPage
            algrafRuntime={algrafRuntime}
            algrafState={algrafState}
            context={dashboardContext}
            lastEmit={lastEmit}
            onContextChange={onContextChange}
            onDataChange={setInteractivityData}
            onEmit={onEmit}
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
            <CaseStudyNav activeStoryId={activeStory.id} onNavigate={navigate} />
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
          </>
        )}
      </main>
    </div>
  );
}

function brandSubtitleForRoute(route: StudioRoute, storySubtitle: string): string {
  switch (route.page) {
    case "landing":
      return "Browser workspace for data stories";
    case "ide":
      return "Data prep and chart preview";
    case "case-studies":
      return "Inspectable data stories";
    case "case-study":
      return storySubtitle;
    case "docs":
      return "Datafarm docs";
    case "docs-how-built":
      return "Slider to chart walkthrough";
    case "labs-interactivity":
      return "Reactive chart demo";
  }
}
