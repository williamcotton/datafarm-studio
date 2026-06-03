import React from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  FileJson,
  FileText,
  LoaderCircle,
  Play,
  RefreshCw,
  Rows3,
  Sparkles,
  Workflow,
} from "lucide-react";

import { AlgrafEditor } from "./AlgrafEditor";
import { DataEditor } from "./DataEditor";
import { PdlEditor } from "./PdlEditor";
import { loadAlgrafRuntime, type AlgrafDiagnostic, type AlgrafRenderResult, type AlgrafRuntime } from "./algrafRuntime";
import {
  loadPdlRuntime,
  type PdlEditorDiagnostic,
  type PdlEditorServiceResult,
  type PdlRunResult,
  type PdlRuntime,
  type PdlRuntimeDiagnostic,
} from "./pdlRuntime";

type RuntimeState = "loading" | "ready" | "error";
type OutputFormat = "csv" | "jsonl";

interface Recipe {
  id: string;
  title: string;
  stage: string;
  summary: string;
  question: string;
  pdlSource: string;
  algrafSource: string;
  graphLabel: string;
}

interface RunSnapshot {
  pdlDisplay: PdlRunResult | null;
  pdlCsv: PdlRunResult | null;
  pdlDiagnostics: PdlEditorDiagnostic[];
  algrafResult: AlgrafRenderResult | null;
  algrafDiagnostics: AlgrafDiagnostic[];
  error: string | null;
}

const RAW_ORDERS = `order_id,order_date,customer_id,region,status,gross_amount,discount,channel,units
1001,2026-01-03,C001,North, completed ,120,10,Web,2
1002,2026-01-04,C002,South,pending,75,,Store,1
1003,2026-01-05,C003,West,completed,200,25,Partner,3
1004,2026-01-05,C001,North,completed,80,0,Web,1
1005,2026-01-06,C004,East,returned,50,5,Store,1
1006,2026-01-07,C005,West,completed,150,,Web,2
1007,2026-01-08,C006,South,completed,90,0,Partner,1
1008,2026-01-09,C002,South,completed,130,15,Web,2
1009,2026-01-10,C003,West, completed,210,20,Store,4
1010,2026-01-11,C004,East,completed,70,0,Web,1
1011,2026-01-12,C005,West,cancelled,95,,Partner,1
1012,2026-01-13,C006,South,completed,160,10,Store,2
`;

const CUSTOMERS = `customer_id,segment,signup_month
C001,Enterprise,2025-11
C002,SMB,2025-10
C003,Enterprise,2025-08
C004,Consumer,2025-09
C005,SMB,2025-12
C006,Consumer,2026-01
`;

const CLEANING_PIPELINE = `load "orders_raw.csv"
  | filter lower(trim("status")) == "completed"
  | mutate
      "net_revenue" = "gross_amount" - coalesce("discount", 0),
      "region_channel" = concat(upper(trim("region")), lit(" / "), lower(trim("channel"))),
      "value_band" = if_else("gross_amount" >= 150, lit("large"), lit("standard"))
  | select
      "order_id",
      "order_date",
      "customer_id",
      "region",
      "channel",
      "net_revenue",
      "units",
      "value_band",
      "region_channel"
  | sort "order_date"
`;

const RECIPES: Recipe[] = [
  {
    id: "clean-orders",
    title: "Clean Raw Orders",
    stage: "Prepare",
    summary: "Normalize statuses, remove non-completed rows, calculate net revenue, and keep a tidy table.",
    question: "Which rows are fit for analysis?",
    pdlSource: CLEANING_PIPELINE,
    graphLabel: "Order-level scatter",
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Completed orders by date") {
    Theme(name: "minimal")
    Parse(column: order_date, as: "date", format: "%Y-%m-%d")
    Scale(fill: region, palette: "accent")
    Scale(size: units, range: [3, 9], label: "Units")
    Guide(axis: x, label: "Order date")
    Guide(axis: y, label: "Net revenue")

    Space(order_date * net_revenue) {
        Point(
            fill: region,
            size: units,
            alpha: 0.78,
            tooltip: [order_id, customer_id, region, channel, net_revenue],
            highlight: region
        )
    }
}
`,
  },
  {
    id: "region-revenue",
    title: "Summarize Regions",
    stage: "Aggregate",
    summary: "Turn order rows into regional metrics with grouped revenue, order count, and total units.",
    question: "Where is revenue concentrated?",
    pdlSource: `let cleaned =
${indentPipeline(CLEANING_PIPELINE)}

cleaned
  | group_by "region"
  | agg
      sum("net_revenue") as "net_revenue",
      count() as "orders",
      sum("units") as "units"
  | sort "net_revenue" desc
`,
    graphLabel: "Horizontal revenue bar chart",
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Net revenue by region") {
    Theme(name: "minimal")
    Scale(fill: region, palette: "accent")
    Guide(axis: x, label: "Net revenue")
    Guide(axis: y, label: "Region")

    Space(net_revenue * region) {
        Bar(fill: region, alpha: 0.86)
    }
}
`,
  },
  {
    id: "segment-revenue",
    title: "Join Segments",
    stage: "Enrich",
    summary: "Join customer attributes to the cleaned orders before grouping by market segment.",
    question: "Which customer segment carries the business?",
    pdlSource: `let customers =
  load "customers.csv"
  | select "customer_id", "segment"

let cleaned =
${indentPipeline(CLEANING_PIPELINE)}

cleaned
  | join customers on "customer_id" kind left
  | group_by "segment"
  | agg
      sum("net_revenue") as "revenue",
      count() as "orders",
      sum("units") as "units"
  | sort "revenue" desc
`,
    graphLabel: "Segment comparison",
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Revenue by customer segment") {
    Theme(name: "minimal")
    Scale(fill: segment, palette: "accent")
    Guide(axis: x, label: "Segment")
    Guide(axis: y, label: "Revenue")

    Space(segment * revenue) {
        Bar(fill: segment, alpha: 0.86)
    }
}
`,
  },
  {
    id: "daily-trend",
    title: "Trend Over Time",
    stage: "Model Shape",
    summary: "Collapse transaction rows into a daily series that can be plotted as a stable trend.",
    question: "What changed over the collection window?",
    pdlSource: `let cleaned =
${indentPipeline(CLEANING_PIPELINE)}

cleaned
  | group_by "order_date"
  | agg
      sum("net_revenue") as "revenue",
      count() as "orders"
  | sort "order_date"
`,
    graphLabel: "Daily revenue trend",
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Daily completed-order revenue") {
    Theme(name: "minimal")
    Parse(column: order_date, as: "date", format: "%Y-%m-%d")
    Guide(axis: x, label: "Date")
    Guide(axis: y, label: "Revenue")

    Space(order_date * revenue) {
        Line(stroke: "#2f6fbb", strokeWidth: 2.6)
        Point(fill: "#e15b4f", size: 5)
    }
}
`,
  },
  {
    id: "channel-mix",
    title: "Compare Channels",
    stage: "Explain",
    summary: "Keep two categorical dimensions in the summary and map them to grouped bars.",
    question: "How do acquisition channels vary by region?",
    pdlSource: `let cleaned =
${indentPipeline(CLEANING_PIPELINE)}

cleaned
  | group_by "region", "channel"
  | agg
      sum("net_revenue") as "net_revenue",
      count() as "orders"
  | sort "region", "channel"
`,
    graphLabel: "Grouped regional channel chart",
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Regional revenue by channel") {
    Theme(name: "minimal")
    Scale(fill: channel, palette: "accent")
    Guide(axis: x, label: "Region and channel")
    Guide(axis: y, label: "Net revenue")

    Space((region / channel) * net_revenue) {
        Bar(fill: channel, alpha: 0.88)
    }
}
`,
  },
];

const SCIENCE_STEPS = [
  {
    icon: <Database size={18} aria-hidden="true" />,
    title: "Start with raw files",
    body: "Keep source data visible. Record odd status casing, blanks, and lookup tables before writing transformations.",
  },
  {
    icon: <Workflow size={18} aria-hidden="true" />,
    title: "Prepare with PDL",
    body: "Filter, mutate, join, aggregate, and sort as a reproducible program instead of a hidden notebook cell.",
  },
  {
    icon: <Rows3 size={18} aria-hidden="true" />,
    title: "Choose the data form",
    body: "Use CSV for charts and inspection, JSON Lines for row-oriented logs, and Arrow streams for typed CLI handoff.",
  },
  {
    icon: <BarChart3 size={18} aria-hidden="true" />,
    title: "Render with Algraf",
    body: "Treat the chart as source too: parse types, map channels, train scales, and emit deterministic SVG.",
  },
];

export function App(): React.ReactElement {
  const [pdlRuntime, setPdlRuntime] = React.useState<PdlRuntime | null>(null);
  const [algrafRuntime, setAlgrafRuntime] = React.useState<AlgrafRuntime | null>(null);
  const [pdlState, setPdlState] = React.useState<RuntimeState>("loading");
  const [algrafState, setAlgrafState] = React.useState<RuntimeState>("loading");
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const [activeRecipeId, setActiveRecipeId] = React.useState(RECIPES[0].id);
  const activeRecipe = RECIPES.find((recipe) => recipe.id === activeRecipeId) ?? RECIPES[0];
  const [ordersCsv, setOrdersCsv] = React.useState(RAW_ORDERS);
  const [customersCsv, setCustomersCsv] = React.useState(CUSTOMERS);
  const [pdlSource, setPdlSource] = React.useState(activeRecipe.pdlSource);
  const [algrafSource, setAlgrafSource] = React.useState(activeRecipe.algrafSource);
  const [outputFormat, setOutputFormat] = React.useState<OutputFormat>("csv");
  const [running, setRunning] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState<RunSnapshot>({
    pdlDisplay: null,
    pdlCsv: null,
    pdlDiagnostics: [],
    algrafResult: null,
    algrafDiagnostics: [],
    error: null,
  });

  const files = React.useMemo(
    () => ({
      "orders_raw.csv": ordersCsv,
      "customers.csv": customersCsv,
    }),
    [customersCsv, ordersCsv],
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

  React.useEffect(() => {
    setPdlSource(activeRecipe.pdlSource);
    setAlgrafSource(activeRecipe.algrafSource);
  }, [activeRecipe.algrafSource, activeRecipe.pdlSource]);

  const runWorkflow = React.useCallback(() => {
    if (!pdlRuntime || !algrafRuntime) {
      return;
    }

    setRunning(true);
    window.setTimeout(() => {
      try {
        const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
          pdlSource,
          files,
          { kind: "diagnostics" },
          "memory/studio.pdl",
        );
        const pdlDiagnostics = pdlEditorResponse.diagnostics;
        const pdlDisplay = pdlRuntime.run(pdlSource, files, outputFormat);
        const pdlCsv = outputFormat === "csv" ? pdlDisplay : pdlRuntime.run(pdlSource, files, "csv");
        const preparedCsv = pdlCsv.stdout ?? "";
        const algrafFiles = preparedCsv ? { ...files, "prepared.csv": preparedCsv } : files;
        const algrafResult = preparedCsv ? algrafRuntime.render(algrafSource, algrafFiles) : null;

        setSnapshot({
          pdlDisplay,
          pdlCsv,
          pdlDiagnostics,
          algrafResult,
          algrafDiagnostics: algrafResult?.diagnostics ?? [],
          error: pdlEditorResponse.error ?? pdlDisplay.error ?? pdlCsv.error ?? algrafResult?.error ?? null,
        });
      } catch (error: unknown) {
        setSnapshot((current) => ({
          ...current,
          error: errorMessage(error),
        }));
      } finally {
        setRunning(false);
      }
    }, 0);
  }, [algrafRuntime, algrafSource, files, outputFormat, pdlRuntime, pdlSource]);

  React.useEffect(() => {
    if (pdlState !== "ready" || algrafState !== "ready") {
      return;
    }

    const timer = window.setTimeout(runWorkflow, 280);
    return () => window.clearTimeout(timer);
  }, [algrafState, pdlState, runWorkflow]);

  const runtimeReady = pdlState === "ready" && algrafState === "ready";
  const preparedCsv = snapshot.pdlCsv?.stdout ?? "";
  const algrafEditorFiles = React.useMemo(
    () => (preparedCsv ? { ...files, "prepared.csv": preparedCsv } : files),
    [files, preparedCsv],
  );
  const displayOutput = snapshot.pdlDisplay?.stdout ?? "";
  const outputRows = outputFormat === "csv" ? countDataRows(displayOutput) : countJsonlRows(displayOutput);
  const pdlDiagnosticCount = snapshot.pdlDiagnostics.length + (snapshot.pdlDisplay?.diagnostics.length ?? 0);
  const algrafDiagnosticCount = snapshot.algrafDiagnostics.length;

  return (
    <div className="studio-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">Df</span>
          <span>
            <strong>Datafarm Studio</strong>
            <small>PDL preparation plus Algraf visualization</small>
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
            <p className="eyebrow">A source-first data-science workbench</p>
            <h1>Move from raw data to prepared tables to reproducible charts.</h1>
            <p>
              This studio fuses the PDL and Algraf browser runtimes into a guided workflow. Edit the raw
              files, change the transformation, choose the output form, and render an SVG chart from the
              prepared table.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" disabled={!runtimeReady || running} onClick={runWorkflow}>
                {running ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                Run workflow
              </button>
              <a className="secondary-button" href="#recipes">
                <Sparkles size={16} aria-hidden="true" />
                Browse recipes
              </a>
            </div>
          </div>
          <div className="hero-status" aria-label="Current workflow summary">
            <Metric label="Recipe" value={activeRecipe.title} />
            <Metric label="Prepared rows" value={preparedCsv ? String(countDataRows(preparedCsv)) : "0"} />
            <Metric label="Shown as" value={outputFormat.toUpperCase()} />
            <Metric label="Diagnostics" value={String(pdlDiagnosticCount + algrafDiagnosticCount)} />
          </div>
        </section>

        <section className="step-grid" aria-label="Data science workflow">
          {SCIENCE_STEPS.map((step) => (
            <article className="step-card" key={step.title}>
              <div className="step-icon">{step.icon}</div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </section>

        <section className="recipe-section" id="recipes">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recipes</p>
              <h2>Pick a data-science move</h2>
            </div>
            <button className="secondary-button" type="button" onClick={runWorkflow} disabled={!runtimeReady || running}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          </div>
          <div className="recipe-list">
            {RECIPES.map((recipe) => (
              <button
                aria-pressed={recipe.id === activeRecipe.id}
                className={`recipe-button ${recipe.id === activeRecipe.id ? "recipe-button-active" : ""}`}
                key={recipe.id}
                type="button"
                onClick={() => setActiveRecipeId(recipe.id)}
              >
                <span>{recipe.stage}</span>
                <strong>{recipe.title}</strong>
                <small>{recipe.question}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-grid">
          <DataPanel
            className="raw-panel"
            icon={<Database size={16} aria-hidden="true" />}
            label="Raw orders"
            meta={`${countDataRows(ordersCsv)} rows`}
            value={ordersCsv}
            onChange={setOrdersCsv}
            modelUri="inmemory://datafarm/orders_raw.csv"
          />
          <DataPanel
            className="raw-panel"
            icon={<FileText size={16} aria-hidden="true" />}
            label="Customers lookup"
            meta={`${countDataRows(customersCsv)} rows`}
            value={customersCsv}
            onChange={setCustomersCsv}
            modelUri="inmemory://datafarm/customers.csv"
          />
          <PdlPanel
            className="code-panel"
            icon={<Workflow size={16} aria-hidden="true" />}
            label="PDL preparation"
            meta={activeRecipe.summary}
            value={pdlSource}
            onChange={setPdlSource}
            diagnostics={snapshot.pdlDiagnostics}
            files={files}
            runtime={pdlRuntime}
          />
          <AlgrafPanel
            className="code-panel"
            icon={<BarChart3 size={16} aria-hidden="true" />}
            label="Algraf chart"
            meta={activeRecipe.graphLabel}
            value={algrafSource}
            onChange={setAlgrafSource}
            diagnostics={diagnosticsForAlgrafEditor(snapshot.algrafDiagnostics, snapshot.algrafResult?.error ?? null)}
            files={algrafEditorFiles}
            runtime={algrafRuntime}
          />
        </section>

        <section className="results-grid">
          <article className="result-panel">
            <div className="panel-header">
              <span>
                {outputFormat === "csv" ? <Rows3 size={16} aria-hidden="true" /> : <FileJson size={16} aria-hidden="true" />}
                Prepared data
              </span>
              <div className="segmented-control" aria-label="Output format">
                <button
                  aria-pressed={outputFormat === "csv"}
                  type="button"
                  onClick={() => setOutputFormat("csv")}
                >
                  CSV
                </button>
                <button
                  aria-pressed={outputFormat === "jsonl"}
                  type="button"
                  onClick={() => setOutputFormat("jsonl")}
                >
                  JSONL
                </button>
              </div>
            </div>
            <pre className="output-block">{displayOutput || runtimeError || "Waiting for the browser runtimes..."}</pre>
            <div className="result-footnote">
              {outputRows} rows shown. Algraf receives the same PDL result as CSV in `prepared.csv`.
            </div>
          </article>

          <article className="result-panel">
            <div className="panel-header">
              <span>
                <BarChart3 size={16} aria-hidden="true" />
                Rendered SVG
              </span>
              <StatusLine running={running} snapshot={snapshot} />
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
        </section>

        <section className="diagnostics-section">
          <DiagnosticsPanel
            title="PDL diagnostics"
            diagnostics={[
              ...snapshot.pdlDiagnostics.map(editorDiagnosticToDisplay),
              ...(snapshot.pdlDisplay?.diagnostics ?? []).map(runtimeDiagnosticToDisplay),
              ...(snapshot.pdlCsv?.diagnostics ?? []).map(runtimeDiagnosticToDisplay),
            ]}
          />
          <DiagnosticsPanel
            title="Algraf diagnostics"
            diagnostics={snapshot.algrafDiagnostics.map(algrafDiagnosticToDisplay)}
          />
        </section>

        <section className="guide-section">
          <div>
            <p className="eyebrow">Good practice</p>
            <h2>Keep every step inspectable</h2>
          </div>
          <div className="guide-grid">
            <div>
              <h3>Raw data</h3>
              <p>Preserve the original files and make assumptions explicit: casing, missing discounts, lookup joins, and rejected statuses.</p>
            </div>
            <div>
              <h3>Prepared forms</h3>
              <p>CSV is ideal for charting and quick review. JSON Lines is useful for row logs. Arrow streams are the right CLI handoff for typed tables.</p>
            </div>
            <div>
              <h3>Graphs</h3>
              <p>Chart after preparation. Use Algraf to declare parsing, scales, guides, and marks so the visual result is reproducible source.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
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

function PdlPanel({
  className,
  icon,
  label,
  meta,
  value,
  onChange,
  diagnostics,
  files,
  runtime,
}: {
  className: string;
  icon: React.ReactElement;
  label: string;
  meta: string;
  value: string;
  onChange: (value: string) => void;
  diagnostics: PdlEditorDiagnostic[];
  files: Record<string, string>;
  runtime: PdlRuntime | null;
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
        <PdlEditor
          diagnostics={diagnostics}
          files={files}
          modelUri="inmemory://datafarm/studio.pdl"
          onChange={onChange}
          runtime={runtime}
          value={value}
        />
      </div>
    </article>
  );
}

function AlgrafPanel({
  className,
  icon,
  label,
  meta,
  value,
  onChange,
  diagnostics,
  files,
  runtime,
}: {
  className: string;
  icon: React.ReactElement;
  label: string;
  meta: string;
  value: string;
  onChange: (value: string) => void;
  diagnostics: AlgrafDiagnostic[];
  files: Record<string, string>;
  runtime: AlgrafRuntime | null;
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
        <AlgrafEditor
          diagnostics={diagnostics}
          files={files}
          modelUri="inmemory://datafarm/studio.ag"
          onChange={onChange}
          runtime={runtime}
          value={value}
        />
      </div>
    </article>
  );
}

function StatusLine({ running, snapshot }: { running: boolean; snapshot: RunSnapshot }): React.ReactElement {
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

interface DisplayDiagnostic {
  code: string;
  severity: string;
  message: string;
}

function DiagnosticsPanel({
  title,
  diagnostics,
}: {
  title: string;
  diagnostics: DisplayDiagnostic[];
}): React.ReactElement {
  return (
    <article className="diagnostics-panel">
      <div className="panel-header">
        <span>
          <AlertCircle size={16} aria-hidden="true" />
          {title}
        </span>
        <small>{diagnostics.length} items</small>
      </div>
      {diagnostics.length > 0 ? (
        <ul>
          {diagnostics.slice(0, 8).map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`} className={`diagnostic diagnostic-${diagnostic.severity}`}>
              <strong>{diagnostic.code}</strong>
              <span>{diagnostic.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-diagnostics">No diagnostics.</p>
      )}
    </article>
  );
}

function editorDiagnosticToDisplay(diagnostic: PdlEditorDiagnostic): DisplayDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
  };
}

function runtimeDiagnosticToDisplay(diagnostic: PdlRuntimeDiagnostic): DisplayDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.help ? `${diagnostic.message} ${diagnostic.help}` : diagnostic.message,
  };
}

function algrafDiagnosticToDisplay(diagnostic: AlgrafDiagnostic): DisplayDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity === "information" ? "info" : diagnostic.severity,
    message: diagnostic.help ? `${diagnostic.message} ${diagnostic.help}` : diagnostic.message,
  };
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

function indentPipeline(source: string): string {
  return source
    .trimEnd()
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function countDataRows(csv: string): number {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  return Math.max(0, lines.length - 1);
}

function countJsonlRows(jsonl: string): number {
  return jsonl.trim() ? jsonl.trim().split(/\r?\n/).length : 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
