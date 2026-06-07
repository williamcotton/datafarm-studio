import React from "react";
import type { AlgrafRenderResult, AlgrafRuntime } from "algraf-wasm";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  MousePointerClick,
  Rows3,
  SlidersHorizontal,
  Table2,
  Workflow,
} from "lucide-react";
import type { PdlContextValue, PdlEditorServiceResult, PdlRunResult, PdlRuntime } from "pdl-wasm";

import { DataPanel } from "./DataPanel";
import { Metric } from "./Metric";
import { AlgrafEditor } from "../AlgrafEditor";
import { PdlEditor } from "../PdlEditor";
import { DATAFARM_EDITOR_THEME, DATAFARM_EDITOR_THEME_NAME } from "../editorTheme";
import {
  ACTIVE_RANKINGS_PATH,
  ALGRAF_MARK_SNAP_RADIUS_PX,
  FLEET_OPTIONS,
  INTERACTIVITY_DATA_PATH,
  INTERACTIVITY_PDL_PATH,
  METRIC_OPTIONS,
  ZONE_OPTIONS,
  ZONE_SUMMARY_PATH,
} from "../interactivityDemoData";
import type { AlgrafEmitPayload, DashboardContext, InteractivitySnapshot, RuntimeState } from "../studioTypes";
import {
  countDataRows,
  diagnosticsForAlgrafEditor,
  emptyInteractivitySnapshot,
  errorMessage,
  hasSavedCsvArtifact,
} from "../studioUtils";

export function InteractivityDemoPage({
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
          <p className="eyebrow">Reactive chart demo</p>
          <h1>Chart clicks feed the next data run</h1>
          <p>
            Use controls to set PDL `param` values, click the selector chart to choose a zone, and watch the dependent
            chart rerender from the new generated tables.
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
        <small>{result?.sidecar ? "events" : "svg"}</small>
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
          <span>Generated CSVs and charts are ready.</span>
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
    const hasPreparedCsv = hasSavedCsvArtifact(pdlResult.files);
    const selectorResult = hasPreparedCsv ? algrafRuntime.render(selectorAlgrafSource, runtimeFiles) : null;
    const receiverResult = hasPreparedCsv ? algrafRuntime.render(receiverAlgrafSource, runtimeFiles) : null;

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
