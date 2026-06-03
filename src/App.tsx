import React from "react";
import {
  AlertCircle,
  BarChart3,
  Bike,
  CheckCircle2,
  CloudRain,
  Database,
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
  loadPdlRuntime,
  type PdlEditorDiagnostic,
  type PdlEditorServiceResult,
  type PdlRunResult,
  type PdlRuntime,
  type PdlRuntimeDiagnostic,
} from "./pdlRuntime";

type RuntimeState = "loading" | "ready" | "error";

interface StoryStep {
  id: string;
  number: string;
  title: string;
  question: string;
  summary: string;
  pdlLabel: string;
  algrafLabel: string;
  pdlSource: string;
  algrafSource: string;
  evidence: string[];
  conclusion: string;
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

const TRIPS_RAW = `trip_id,trip_date,started_at,rider_type,pass_type,bike_type,start_station_id,end_station_id,duration_min,distance_km,fare_usd,status
T1001,2026-04-01,07:42,member,monthly,classic,S01,S04,18,4.2,3.80,completed
T1002,2026-04-01,08:10,member,monthly,classic,S02,S05,22,5.1,4.40,completed
T1003,2026-04-01,12:35,visitor,single,ebike,S08,S03,34,7.8,9.20,completed
T1004,2026-04-01,17:55,member,monthly,ebike,S04,S01,16,4.0,4.10,completed
T1005,2026-04-02,07:25,member,monthly,classic,S01,S06,21,4.9,4.20,completed
T1006,2026-04-02,09:05,visitor,day,classic,S03,S07,46,9.6,11.50,completed
T1007,2026-04-02,18:20,member,monthly,classic,S05,S02,24,5.4,4.60,completed
T1008,2026-04-03,08:30,member,monthly,ebike,S02,S04,15,3.7,4.00,completed
T1009,2026-04-03,11:12,visitor,single,classic,S07,S03,29,6.1,7.70,completed
T1010,2026-04-03,16:45,member,monthly,classic,S06,S01,20,4.6,4.00,completed
T1011,2026-04-04,10:18,visitor,day,ebike,S08,S09,52,11.2,15.10,completed
T1012,2026-04-04,13:44,visitor,day,classic,S09,S08,39,8.3,10.80,completed
T1013,2026-04-04,15:20,member,monthly,cargo,S04,S10,31,5.8,7.10,completed
T1014,2026-04-05,08:08,member,monthly,classic,S01,S05,19,4.1,3.90,completed
T1015,2026-04-05,14:15,visitor,single,ebike,S03,S08,43,9.4,13.80,completed
T1016,2026-04-05,19:02,member,monthly,classic,S05,S01,22,4.7,4.30,completed
T1017,2026-04-06,07:48,member,monthly,classic,S02,S06,23,5.0,4.50,completed
T1018,2026-04-06,08:12,member,monthly,classic,S01,S04,17,4.2,3.70,completed
T1019,2026-04-06,12:10,visitor,single,ebike,S08,S03,36,8.0,9.80,cancelled
T1020,2026-04-06,17:36,member,monthly,ebike,S04,S02,14,3.5,3.90,completed
T1021,2026-04-07,07:55,member,monthly,classic,S06,S01,20,4.4,4.00,completed
T1022,2026-04-07,09:40,visitor,day,classic,S03,S07,48,9.9,12.20,completed
T1023,2026-04-07,18:08,member,monthly,classic,S05,S02,26,5.5,4.90,completed
T1024,2026-04-08,08:16,member,monthly,ebike,S02,S04,15,3.8,4.10,completed
T1025,2026-04-08,11:30,visitor,single,classic,S07,S03,33,6.8,8.60,completed
T1026,2026-04-08,16:25,member,monthly,cargo,S04,S10,35,6.2,7.60,completed
T1027,2026-04-09,07:32,member,monthly,classic,S01,S06,22,4.9,4.30,completed
T1028,2026-04-09,13:20,visitor,day,ebike,S08,S09,57,12.4,16.50,completed
T1029,2026-04-09,17:42,member,monthly,classic,S06,S01,21,4.7,4.20,completed
T1030,2026-04-10,08:05,member,monthly,classic,S02,S05,24,5.1,4.60,completed
T1031,2026-04-10,12:14,visitor,single,classic,S03,S08,41,8.7,11.70,maintenance
T1032,2026-04-10,18:52,member,monthly,ebike,S05,S02,19,4.5,4.80,completed
T1033,2026-04-11,10:25,visitor,day,ebike,S08,S09,64,13.5,18.20,completed
T1034,2026-04-11,11:40,visitor,day,classic,S09,S03,44,9.0,12.10,completed
T1035,2026-04-11,15:18,member,monthly,classic,S04,S01,18,4.0,3.80,completed
T1036,2026-04-12,08:42,member,monthly,classic,S01,S05,20,4.3,4.10,completed
T1037,2026-04-12,14:12,visitor,single,ebike,S03,S08,47,9.8,14.30,completed
T1038,2026-04-12,19:05,member,monthly,classic,S05,S01,23,4.8,4.40,completed
T1039,2026-04-13,07:58,member,monthly,classic,S02,S06,25,5.2,4.80,completed
T1040,2026-04-13,08:22,member,monthly,classic,S01,S04,18,4.1,3.90,completed
T1041,2026-04-13,17:18,member,monthly,ebike,S04,S02,16,3.7,4.20,completed
T1042,2026-04-14,07:46,member,monthly,classic,S06,S01,19,4.4,3.90,completed
T1043,2026-04-14,12:05,visitor,single,classic,S07,S03,35,7.0,9.10,completed
T1044,2026-04-14,18:36,member,monthly,classic,S05,S02,27,5.8,5.10,completed
`;

const STATIONS = `station_id,station_name,zone,capacity,opened_year
S01,Central Station,Downtown,32,2021
S02,Library Plaza,Downtown,28,2020
S03,River Park,Riverfront,22,2022
S04,Market Hall,Market,26,2021
S05,North Campus,Campus,24,2020
S06,Science Center,Campus,18,2023
S07,Marina Gate,Riverfront,20,2022
S08,Museum Loop,Cultural,30,2021
S09,Harbor Point,Riverfront,16,2023
S10,Warehouse Row,Market,14,2024
`;

const WEATHER_DAILY = `trip_date,temp_f,precip_in,wind_mph,condition
2026-04-01,62,0.00,8,clear
2026-04-02,65,0.00,6,clear
2026-04-03,58,0.18,13,rain
2026-04-04,61,0.04,10,cloudy
2026-04-05,67,0.00,7,clear
2026-04-06,54,0.32,16,rain
2026-04-07,56,0.21,14,rain
2026-04-08,63,0.00,9,clear
2026-04-09,66,0.00,5,clear
2026-04-10,59,0.08,12,cloudy
2026-04-11,70,0.00,6,clear
2026-04-12,73,0.00,7,clear
2026-04-13,57,0.27,15,rain
2026-04-14,60,0.11,11,cloudy
`;

const CLEANED_TRIPS_PIPELINE = `load "trips_raw.csv"
  | filter lower(trim("status")) == "completed"
  | select
      "trip_id",
      "trip_date",
      "rider_type",
      "pass_type",
      "bike_type",
      "start_station_id",
      "end_station_id",
      "duration_min",
      "distance_km",
      "fare_usd"
  | sort "trip_date", "trip_id"
`;

const STORY_STEPS: StoryStep[] = [
  {
    id: "eligible-rides",
    number: "01",
    title: "Establish the Valid Trip Set",
    question: "Which rides can we analyze?",
    summary:
      "Start by removing cancelled and maintenance rows, then keep the trip fields used by the first exploratory chart.",
    pdlLabel: "clean-valid-rides.pdl",
    algrafLabel: "duration-distance.ag",
    pdlSource: `let cleaned =
${indentPipeline(CLEANED_TRIPS_PIPELINE)}

cleaned
  | select
      "trip_id",
      "trip_date",
      "rider_type",
      "bike_type",
      "duration_min",
      "distance_km",
      "fare_usd"
  | sort "trip_date", "trip_id"
`,
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Valid bike-share trips") {
    Theme(name: "minimal")
    Scale(fill: rider_type, palette: "accent", label: "Rider type")
    Scale(size: fare_usd,
          range: [3, 10],
          breaks: [4, 8, 12, 16],
          labels: ["$4", "$8", "$12", "$16"],
          label: "Fare")
    Guide(axis: x, label: "Distance (km)")
    Guide(axis: y, label: "Duration (min)")

    Space(distance_km * duration_min) {
        Point(
            fill: rider_type,
            size: fare_usd,
            alpha: 0.72,
            tooltip: [trip_id, trip_date, rider_type, bike_type, fare_usd],
            highlight: rider_type
        )
    }
}
`,
    evidence: [
      "The valid set removes cancelled and maintenance events before any metric is calculated.",
      "The table contains only fields used by the scatterplot and tooltip.",
      "Visitor rides tend to sit farther right and higher up: longer distances and longer durations.",
    ],
    conclusion:
      "The service has two visible ride modes: compact member commuting and longer visitor leisure rides. That split should drive the next summaries.",
  },
  {
    id: "daily-demand",
    number: "02",
    title: "Compare Daily Demand by Rider Type",
    question: "Does demand behave differently for members and visitors?",
    summary:
      "Aggregate the cleaned trips by day and rider type so the chart can show volume and revenue without carrying trip-level fields.",
    pdlLabel: "daily-demand.pdl",
    algrafLabel: "daily-demand.ag",
    pdlSource: `let cleaned =
${indentPipeline(CLEANED_TRIPS_PIPELINE)}

cleaned
  | group_by "trip_date", "rider_type"
  | agg
      count() as "trips",
      sum("fare_usd") as "revenue"
  | sort "trip_date", "rider_type"
`,
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Daily trips by rider type") {
    Theme(name: "minimal")
    Parse(column: trip_date, as: "date", format: "%Y-%m-%d")
    Scale(stroke: rider_type, palette: "accent", label: "Rider type")
    Scale(fill: rider_type, palette: "accent", label: "Rider type")
    Scale(size: revenue,
          range: [3, 10],
          breaks: [10, 25, 50],
          labels: ["$10", "$25", "$50"],
          label: "Revenue")
    Scale(axis: y, domain: [0, 4], breaks: [0, 1, 2, 3, 4], labels: ["0", "1", "2", "3", "4"], expand: [0, 0.05])
    Guide(axis: x, label: "Date", timeFormat: "%b %-d", tickLabelRows: 2)
    Guide(axis: y, label: "Trips")

    Space(trip_date * trips) {
        Line(stroke: rider_type, strokeWidth: 2.4)
        Point(
            fill: rider_type,
            size: revenue,
            alpha: 0.86,
            tooltip: [trip_date, rider_type, trips, revenue],
            highlight: rider_type
        )
    }
}
`,
    evidence: [
      "The final table is one row per date and rider type.",
      "Revenue remains in the table because the chart uses it as point size.",
      "Visitor demand spikes on weekend dates while member demand is steadier across weekdays.",
    ],
    conclusion:
      "Members provide the predictable base of demand; visitors create the peaks. Operations should plan for both rather than averaging them together.",
  },
  {
    id: "station-context",
    number: "03",
    title: "Join Station Context",
    question: "Which station zones are producing demand?",
    summary:
      "Join trip starts to station metadata, then aggregate by zone. The station table supplies context the raw trips do not contain.",
    pdlLabel: "start-zone-demand.pdl",
    algrafLabel: "zone-revenue.ag",
    pdlSource: `let cleaned =
${indentPipeline(CLEANED_TRIPS_PIPELINE)}

let start_stations =
  load "stations.csv"
  | select
      "station_id" as "start_station_id",
      "zone",
      "capacity"

cleaned
  | join start_stations on "start_station_id" kind left
  | group_by "zone"
  | agg
      count() as "trips",
      sum("fare_usd") as "revenue",
      mean("duration_min") as "avg_duration"
  | sort "revenue" desc
`,
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Start-zone revenue") {
    Theme(name: "minimal")
    Scale(fill: zone, palette: "accent", label: "Start zone")
    Scale(size: trips,
          range: [4, 12],
          breaks: [4, 8, 12],
          labels: ["4", "8", "12"],
          label: "Trips")
    Scale(axis: x,
          breaks: [0, 100, 200, 300],
          labels: ["$0", "$100", "$200", "$300"],
          expand: [0, 0.05])
    Guide(axis: x, label: "Revenue")
    Guide(axis: y, label: "Start zone")

    Space(revenue * zone) {
        Bar(fill: zone, alpha: 0.84)
        Point(
            fill: "#24343a",
            size: trips,
            alpha: 0.85,
            tooltip: [zone, trips, revenue, avg_duration]
        )
    }
}
`,
    evidence: [
      "The trip table is joined only after filtering to valid completed rides.",
      "The prepared result carries zone, trips, revenue, and avg_duration because each appears in the chart.",
      "Riverfront and Cultural stations are important visitor-oriented revenue zones, while Downtown and Campus anchor commuter volume.",
    ],
    conclusion:
      "Station geography explains more than raw trip counts. Visitor-heavy zones generate larger revenue per ride, while commuter zones produce steadier throughput.",
  },
  {
    id: "weather-context",
    number: "04",
    title: "Join Weather Context",
    question: "Does weather change ride behavior?",
    summary:
      "Join daily weather to valid trips, aggregate by date and condition, and compare precipitation with average duration.",
    pdlLabel: "weather-behavior.pdl",
    algrafLabel: "weather-duration.ag",
    pdlSource: `let cleaned =
${indentPipeline(CLEANED_TRIPS_PIPELINE)}

let weather =
  load "weather_daily.csv"
  | select
      "trip_date",
      "condition",
      "precip_in"

cleaned
  | join weather on "trip_date" kind left
  | group_by "trip_date", "condition", "precip_in"
  | agg
      count() as "trips",
      mean("duration_min") as "avg_duration",
      sum("fare_usd") as "revenue"
  | sort "trip_date"
`,
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 430, title: "Weather and ride duration") {
    Theme(name: "minimal")
    Scale(fill: condition, palette: "accent", label: "Condition")
    Scale(size: trips,
          range: [4, 12],
          breaks: [2, 3, 4],
          labels: ["2", "3", "4"],
          label: "Trips")
    Scale(axis: x,
          domain: [0, 0.35],
          breaks: [0, 0.1, 0.2, 0.3],
          labels: ["0", "0.1", "0.2", "0.3"],
          expand: [0.02, 0])
    Scale(axis: y,
          breaks: [15, 25, 35, 45],
          labels: ["15", "25", "35", "45"])
    Guide(axis: x, label: "Precipitation (in)")
    Guide(axis: y, label: "Average duration (min)")

    Space(precip_in * avg_duration) {
        Point(
            fill: condition,
            size: trips,
            alpha: 0.82,
            tooltip: [trip_date, condition, precip_in, trips, avg_duration, revenue],
            highlight: condition
        )
    }
}
`,
    evidence: [
      "Weather is joined by trip_date, not manually copied into the trip table.",
      "The prepared table is one row per day and condition, with precipitation, trips, average duration, and revenue.",
      "Rainy days show fewer points but not necessarily short rides; the sample suggests lower volume more than shorter duration.",
    ],
    conclusion:
      "Weather appears to suppress volume more than ride length. The operational response is staffing/rebalancing capacity, not assuming all rainy-day rides are short.",
  },
  {
    id: "station-priority",
    number: "05",
    title: "Prioritize Rebalancing Attention",
    question: "Which individual start stations need attention?",
    summary:
      "Join station names and capacity, then summarize start-station activity. This turns exploration into an operating priority list.",
    pdlLabel: "station-priority.pdl",
    algrafLabel: "station-throughput.ag",
    pdlSource: `let cleaned =
${indentPipeline(CLEANED_TRIPS_PIPELINE)}

let start_stations =
  load "stations.csv"
  | select
      "station_id" as "start_station_id",
      "station_name",
      "zone",
      "capacity"

cleaned
  | join start_stations on "start_station_id" kind left
  | group_by "station_name", "zone", "capacity"
  | agg
      count() as "trips",
      sum("fare_usd") as "revenue"
  | sort "trips" desc
`,
    algrafSource: `Chart(data: "prepared.csv", width: 760, height: 470, title: "Start-station throughput") {
    Theme(name: "minimal")
    Scale(fill: zone, palette: "accent", label: "Zone")
    Scale(size: capacity,
          range: [4, 12],
          breaks: [16, 24, 32],
          labels: ["16 docks", "24 docks", "32 docks"],
          label: "Dock capacity")
    Scale(axis: x, domain: [0, 8], breaks: [0, 2, 4, 6, 8], labels: ["0", "2", "4", "6", "8"], expand: [0, 0.05])
    Guide(axis: x, label: "Trips")
    Guide(axis: y, label: "Station")

    Space(trips * station_name) {
        Bar(fill: zone, alpha: 0.84)
        Point(
            fill: "#24343a",
            size: capacity,
            alpha: 0.85,
            tooltip: [station_name, zone, capacity, trips, revenue]
        )
    }
}
`,
    evidence: [
      "Station names and capacity come from the station lookup, not the trip export.",
      "The prepared output keeps the fields used by the priority chart and tooltip.",
      "Stations with high trip counts and lower capacity are the first candidates for rebalancing review.",
    ],
    conclusion:
      "The exploration ends with an action list: inspect high-throughput start stations against dock capacity before changing fleet allocation.",
  },
];

const INTAKE_STEPS = [
  {
    icon: <Search size={18} aria-hidden="true" />,
    title: "Start with trip events",
    body: "The raw export includes operational rows that are not valid completed rides, so eligibility has to be explicit.",
  },
  {
    icon: <GitMerge size={18} aria-hidden="true" />,
    title: "Join context only when needed",
    body: "Stations explain geography and capacity. Weather explains day-level conditions. Neither belongs in the first clean table.",
  },
  {
    icon: <Workflow size={18} aria-hidden="true" />,
    title: "Prepare one table per question",
    body: "Each PDL program emits the smallest table that supports the chart and conclusion for that section.",
  },
  {
    icon: <BarChart3 size={18} aria-hidden="true" />,
    title: "Render the evidence",
    body: "Every section pairs the prepared table with an Algraf chart so the claim can be checked from source to SVG.",
  },
];

export function App(): React.ReactElement {
  const [pdlRuntime, setPdlRuntime] = React.useState<PdlRuntime | null>(null);
  const [algrafRuntime, setAlgrafRuntime] = React.useState<AlgrafRuntime | null>(null);
  const [pdlState, setPdlState] = React.useState<RuntimeState>("loading");
  const [algrafState, setAlgrafState] = React.useState<RuntimeState>("loading");
  const [runtimeError, setRuntimeError] = React.useState<string | null>(null);
  const [tripsCsv, setTripsCsv] = React.useState(TRIPS_RAW);
  const [stationsCsv, setStationsCsv] = React.useState(STATIONS);
  const [weatherCsv, setWeatherCsv] = React.useState(WEATHER_DAILY);
  const [pdlSources, setPdlSources] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(STORY_STEPS.map((step) => [step.id, step.pdlSource])),
  );
  const [algrafSources, setAlgrafSources] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(STORY_STEPS.map((step) => [step.id, step.algrafSource])),
  );
  const [running, setRunning] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<StepSnapshots>({});

  const files = React.useMemo(
    () => ({
      "trips_raw.csv": tripsCsv,
      "stations.csv": stationsCsv,
      "weather_daily.csv": weatherCsv,
    }),
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
        const nextSnapshots: StepSnapshots = {};

        for (const step of STORY_STEPS) {
          const pdlSource = pdlSources[step.id] ?? step.pdlSource;
          const algrafSource = algrafSources[step.id] ?? step.algrafSource;
          const pdlEditorResponse: PdlEditorServiceResult = pdlRuntime.editorService(
            pdlSource,
            files,
            { kind: "diagnostics" },
            `memory/${step.id}.pdl`,
          );
          const pdlCsv = pdlRuntime.run(pdlSource, files, "csv");
          const preparedCsv = pdlCsv.stdout ?? "";
          const algrafFiles = preparedCsv ? { ...files, "prepared.csv": preparedCsv } : files;
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
  const totalPreparedRows = STORY_STEPS.reduce((total, step) => {
    const csv = snapshots[step.id]?.pdlCsv?.stdout ?? "";
    return total + countDataRows(csv);
  }, 0);
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
            <p className="eyebrow">Urban bike-share case study</p>
            <h1>Explore a real operating question, one table and one graph at a time.</h1>
            <p>
              Start with trip events, then add station and weather context only when the question calls for
              it. Each section has the same four folds: a PDL editor, an Algraf editor, prepared output data,
              and the rendered chart.
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
          </div>
          <div className="hero-status" aria-label="Current workflow summary">
            <Metric label="Trip rows" value={String(countDataRows(tripsCsv))} />
            <Metric label="Stations" value={String(countDataRows(stationsCsv))} />
            <Metric label="Prepared rows" value={String(totalPreparedRows)} />
            <Metric label="Diagnostics" value={String(totalDiagnostics)} />
          </div>
        </section>

        <section className="step-grid" aria-label="Investigation workflow">
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
              <h2>Three sources at the top of the analysis</h2>
              <p className="section-copy">
                The raw trip export is intentionally not enough. Station metadata and weather are available,
                but the story only joins them when they answer a concrete question.
              </p>
            </div>
          </div>
          <div className="source-grid source-grid-three" aria-label="Raw data files">
            <DataPanel
              className="raw-panel"
              icon={<Bike size={16} aria-hidden="true" />}
              label="Trip events"
              meta={`${countDataRows(tripsCsv)} rows`}
              value={tripsCsv}
              onChange={setTripsCsv}
              modelUri="inmemory://datafarm/trips_raw.csv"
            />
            <DataPanel
              className="raw-panel"
              icon={<MapPinned size={16} aria-hidden="true" />}
              label="Stations"
              meta={`${countDataRows(stationsCsv)} rows`}
              value={stationsCsv}
              onChange={setStationsCsv}
              modelUri="inmemory://datafarm/stations.csv"
            />
            <DataPanel
              className="raw-panel"
              icon={<CloudRain size={16} aria-hidden="true" />}
              label="Daily weather"
              meta={`${countDataRows(weatherCsv)} rows`}
              value={weatherCsv}
              onChange={setWeatherCsv}
              modelUri="inmemory://datafarm/weather_daily.csv"
            />
          </div>
        </section>

        <section className="story-stack" id="story" aria-label="Linear exploration story">
          {STORY_STEPS.map((step) => {
            const snapshot = snapshots[step.id] ?? emptyStepSnapshot();
            const preparedCsv = snapshot.pdlCsv?.stdout ?? "";
            const pdlSource = pdlSources[step.id] ?? step.pdlSource;
            const algrafSource = algrafSources[step.id] ?? step.algrafSource;
            const algrafFiles = preparedCsv ? { ...files, "prepared.csv": preparedCsv } : files;

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
            <p className="eyebrow">Method</p>
            <h2>What this studio is demonstrating</h2>
          </div>
          <div className="guide-grid">
            <div>
              <h3>One question per table</h3>
              <p>The prepared output should not be a dumping ground. Each section emits the table its chart uses.</p>
            </div>
            <div>
              <h3>Context is deliberate</h3>
              <p>Station and weather joins happen only after the raw trips establish the first pattern.</p>
            </div>
            <div>
              <h3>Charts are source</h3>
              <p>Algraf makes the visual evidence inspectable beside the PDL transformation that prepared it.</p>
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
              modelUri={`inmemory://datafarm/${step.id}.pdl`}
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
              modelUri={`inmemory://datafarm/${step.id}.ag`}
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
              Prepared output
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
