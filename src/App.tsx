import React from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Database,
  FileJson,
  FileText,
  GitMerge,
  Lightbulb,
  LoaderCircle,
  Play,
  RefreshCw,
  Rows3,
  Search,
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
  evidence: string[];
  conclusion: string;
  nextQuestion: string;
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
    evidence: [
      "Only completed orders should enter revenue analysis; pending, returned, and cancelled rows stay out.",
      "Status values need normalization because the raw export includes extra spaces.",
      "Net revenue is derived from gross amount minus discount, with blank discounts treated as zero.",
    ],
    conclusion:
      "The first finding is about data quality: after cleaning, 9 of 12 order rows are valid completed transactions. That gives us a defensible table before any chart tells a business story.",
    nextQuestion: "After the eligible rows are stable, summarize revenue by region, segment, or day.",
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
    evidence: [
      "West contributes 515 in net revenue, more than any other region in this sample.",
      "South follows with 355, while North and East trail with smaller completed-order totals.",
      "The aggregation keeps order count and units available for follow-up checks.",
    ],
    conclusion:
      "Regional revenue is concentrated in the West. The chart makes that visible, but the PDL table gives the exact totals and keeps the result auditable.",
    nextQuestion: "Check whether West is strong because of customer segment mix, channel mix, or unusually large orders.",
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
    evidence: [
      "The customers lookup adds segment labels through the shared customer_id key.",
      "Enterprise customers account for 555 in revenue after the join.",
      "Consumer and SMB are closer together, with 310 and 265 respectively.",
    ],
    conclusion:
      "The customer context changes the interpretation: Enterprise is the leading segment, so the regional result is partly a segment story, not just a geography story.",
    nextQuestion: "Inspect whether Enterprise revenue is coming from many customers or a few high-value accounts.",
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
    evidence: [
      "The daily table collapses order-level noise into one row per order date.",
      "January 5 is the local high point because two completed orders land on the same day.",
      "The series has visible gaps, which is important context before calling it a trend.",
    ],
    conclusion:
      "The sample does not prove a durable trend, but it does show where activity clusters. The honest conclusion is a short-window peak, not a forecast.",
    nextQuestion: "Bring in more days before fitting a trend or comparing periods.",
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
    evidence: [
      "Region and channel are both retained in the grouped table, so the chart can compare mix.",
      "West has completed revenue across partner, web, and store channels.",
      "North and East only appear through web in this small sample.",
    ],
    conclusion:
      "Channel mix explains part of the regional pattern: West is broader across channels, while some regions are represented by a single channel in the current data.",
    nextQuestion: "Use a larger extract to see whether single-channel regions are real behavior or sample sparsity.",
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

const INVESTIGATION_STEPS = [
  {
    icon: <Search size={18} aria-hidden="true" />,
    title: "Where did this data come from?",
    body: "Treat the orders table as an export from an operational system. Before analysis, inspect its grain, keys, messy values, and missing fields.",
  },
  {
    icon: <GitMerge size={18} aria-hidden="true" />,
    title: "Can we join other context?",
    body: "Ask whether another file explains the rows. Here, customers.csv can add segment context through customer_id.",
  },
  {
    icon: <Workflow size={18} aria-hidden="true" />,
    title: "What table answers the question?",
    body: "Use PDL to make the analytic table explicit: clean eligibility, derive net revenue, join lookup data, or aggregate.",
  },
  {
    icon: <Lightbulb size={18} aria-hidden="true" />,
    title: "What conclusion is justified?",
    body: "Use Algraf for visual evidence, then write the conclusion narrowly enough that the prepared table supports it.",
  },
];

const SOURCE_QUESTIONS = [
  "What is the row grain? One row appears to be one order event.",
  "Which rows belong in revenue analysis? Only completed orders after status normalization.",
  "Which fields are derived? Net revenue must be calculated; it is not a raw column.",
];

const JOIN_QUESTIONS = [
  "Do the files share a stable key? Both tables include customer_id.",
  "What does the lookup add? Segment and signup month give customer context.",
  "What should we verify? One customer row per customer_id before joining.",
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
            <p className="eyebrow">Order export case study</p>
            <h1>Start with raw orders. Earn the chart.</h1>
            <p>
              The studio begins with an imperfect order export, asks what the rows mean, checks whether
              customer context can be joined, then uses PDL and Algraf to turn one analysis question into
              evidence and a defensible conclusion.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button" disabled={!runtimeReady || running} onClick={runWorkflow}>
                {running ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                Run workflow
              </button>
              <a className="secondary-button" href="#analysis-question">
                <Sparkles size={16} aria-hidden="true" />
                Choose question
              </a>
            </div>
          </div>
          <div className="hero-status" aria-label="Current workflow summary">
            <Metric label="Raw order rows" value={String(countDataRows(ordersCsv))} />
            <Metric label="Join rows" value={String(countDataRows(customersCsv))} />
            <Metric label="Question" value={activeRecipe.question} />
            <Metric label="Prepared rows" value={preparedCsv ? String(countDataRows(preparedCsv)) : "0"} />
          </div>
        </section>

        <section className="step-grid" aria-label="Investigation workflow">
          {INVESTIGATION_STEPS.map((step) => (
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
              <p className="eyebrow">1. Raw intake</p>
              <h2>Before transforming anything, ask what the files are.</h2>
            </div>
          </div>
          <div className="case-grid">
            <QuestionCard
              icon={<Database size={17} aria-hidden="true" />}
              label="Primary source"
              title="orders_raw.csv"
              body="An operational order export with one row per order event. It has useful analysis fields, but also mixed status formatting and blank discounts."
              questions={SOURCE_QUESTIONS}
            />
            <QuestionCard
              icon={<GitMerge size={17} aria-hidden="true" />}
              label="Join candidate"
              title="customers.csv"
              body="A small lookup table that explains who placed each order. It should be joined only after the order rows are cleaned enough to analyze."
              questions={JOIN_QUESTIONS}
            />
          </div>
        </section>

        <section className="source-grid" aria-label="Raw data files">
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
        </section>

        <section className="recipe-section" id="analysis-question">
          <div className="section-heading">
            <div>
              <p className="eyebrow">2. Explore</p>
              <h2>Pick the next analysis question</h2>
              <p className="section-copy">
                Each question rewrites the PDL table and the Algraf chart together, so the conclusion is tied
                to a visible transformation.
              </p>
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

        <section className="section-heading analysis-heading">
          <div>
            <p className="eyebrow">3. Prepare and visualize</p>
            <h2>{activeRecipe.title}</h2>
            <p className="section-copy">{activeRecipe.summary}</p>
          </div>
        </section>

        <section className="workspace-grid">
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

        <section className="conclusion-section" aria-label="Evidence and conclusion">
          <article className="conclusion-card">
            <p className="eyebrow">4. Conclusion</p>
            <h2>What the current evidence supports</h2>
            <p className="conclusion-text">{activeRecipe.conclusion}</p>
            <ul className="evidence-list">
              {activeRecipe.evidence.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="next-question">
              <strong>Next question</strong>
              <span>{activeRecipe.nextQuestion}</span>
            </div>
          </article>
          <article className="audit-card">
            <p className="eyebrow">Audit trail</p>
            <h2>The conclusion is tied to source</h2>
            <div className="audit-metrics">
              <Metric label="Output form" value={outputFormat.toUpperCase()} />
              <Metric label="PDL issues" value={String(pdlDiagnosticCount)} />
              <Metric label="Algraf issues" value={String(algrafDiagnosticCount)} />
              <Metric label="Prepared rows" value={preparedCsv ? String(countDataRows(preparedCsv)) : "0"} />
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
            <p className="eyebrow">Method</p>
            <h2>Keep the claim as traceable as the code</h2>
          </div>
          <div className="guide-grid">
            <div>
              <h3>Source first</h3>
              <p>Do not begin with a chart. First ask what produced the rows, what the grain is, and which rows belong in the analysis.</p>
            </div>
            <div>
              <h3>Join with purpose</h3>
              <p>Only join context that answers the question. Here, customer segment explains revenue patterns that raw orders cannot.</p>
            </div>
            <div>
              <h3>Conclude narrowly</h3>
              <p>Let PDL define the evidence table and Algraf show it. The written conclusion should not outrun those two artifacts.</p>
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

function QuestionCard({
  icon,
  label,
  title,
  body,
  questions,
}: {
  icon: React.ReactElement;
  label: string;
  title: string;
  body: string;
  questions: string[];
}): React.ReactElement {
  return (
    <article className="question-card">
      <div className="question-card-kicker">
        {icon}
        <span>{label}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      <ul>
        {questions.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </article>
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
