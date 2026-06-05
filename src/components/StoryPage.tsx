import type React from "react";
import type { AlgrafRuntime } from "algraf-wasm";
import { LoaderCircle, Play, Route } from "lucide-react";
import type { PdlRuntime } from "pdl-wasm";

import { DataPanel } from "./DataPanel";
import { Metric } from "./Metric";
import { StorySection } from "./StorySection";
import { methodIcon, rawDataIcon } from "./storyIcons";
import { filesWithPreparedOutput, filesWithSupportingFiles } from "../storyWorkflow";
import type { RawDataFile, StoryBundle } from "../storyBundles";
import type { StepSnapshots } from "../studioTypes";
import { countDataRows, diagnosticsForAlgrafEditor, emptyStepSnapshot, formatBytes } from "../studioUtils";

export function StoryPage({
  activeStory,
  algrafRuntime,
  algrafSources,
  files,
  onAlgrafSourceChange,
  onPdlSourceChange,
  onRawDataChange,
  onRunWorkflow,
  pdlRuntime,
  pdlSources,
  rawSources,
  runtimeError,
  runtimeReady,
  running,
  snapshots,
  totalDiagnostics,
}: {
  activeStory: StoryBundle;
  algrafRuntime: AlgrafRuntime | null;
  algrafSources: Record<string, string>;
  files: Record<string, string>;
  onAlgrafSourceChange: (stepId: string, value: string) => void;
  onPdlSourceChange: (stepId: string, value: string) => void;
  onRawDataChange: (rawFile: RawDataFile, value: string) => void;
  onRunWorkflow: () => void;
  pdlRuntime: PdlRuntime | null;
  pdlSources: Record<string, string>;
  rawSources: Record<string, string>;
  runtimeError: string | null;
  runtimeReady: boolean;
  running: boolean;
  snapshots: StepSnapshots;
  totalDiagnostics: number;
}): React.ReactElement {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{activeStory.hero.eyebrow}</p>
          <h1>{activeStory.hero.headline}</h1>
          <p>{activeStory.hero.subhead}</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" disabled={!runtimeReady || running} onClick={onRunWorkflow}>
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
                onChange={(nextValue) => onRawDataChange(rawFile, nextValue)}
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
          const algrafFiles = preparedCsv
            ? filesWithPreparedOutput(files, step, preparedCsv, undefined, snapshot.pdlCsv?.files)
            : filesWithSupportingFiles(files, step);

          return (
            <StorySection
              algrafDiagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
              algrafFiles={algrafFiles}
              algrafRuntime={algrafRuntime}
              algrafSource={algrafSource}
              key={step.id}
              onAlgrafChange={(value) => onAlgrafSourceChange(step.id, value)}
              onPdlChange={(value) => onPdlSourceChange(step.id, value)}
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
  );
}
