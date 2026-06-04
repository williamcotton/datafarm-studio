import storyMarkdownSource from "../../datafarm-bikeshare/STORY.md?raw";
import storyProgramSource from "../../datafarm-bikeshare/story.pdl?raw";
import dailyRiderTripsPdl from "../../datafarm-bikeshare/01/daily-rider-trips.pdl?raw";
import dailyRiderTripsAlgraf from "../../datafarm-bikeshare/01/daily-rider-trips.ag?raw";
import validTripsPdl from "../../datafarm-bikeshare/02/valid-trips.pdl?raw";
import durationDistanceAlgraf from "../../datafarm-bikeshare/02/duration-distance.ag?raw";
import revenueInversionPdl from "../../datafarm-bikeshare/03/revenue-inversion.pdl?raw";
import revenueInversionAlgraf from "../../datafarm-bikeshare/03/revenue-inversion.ag?raw";
import weatherSplitPdl from "../../datafarm-bikeshare/04/weather-split.pdl?raw";
import weatherSplitAlgraf from "../../datafarm-bikeshare/04/weather-split.ag?raw";
import dockPriorityPdl from "../../datafarm-bikeshare/05/dock-priority.pdl?raw";
import dockPriorityAlgraf from "../../datafarm-bikeshare/05/dock-priority.ag?raw";
import tripsRawCsv from "../../datafarm-bikeshare/data/trips_raw.csv?raw";
import stationsCsv from "../../datafarm-bikeshare/data/stations.csv?raw";
import weatherDailyCsv from "../../datafarm-bikeshare/data/weather_daily.csv?raw";

export interface StoryStep {
  id: string;
  number: string;
  title: string;
  question: string;
  summary: string;
  pdlLabel: string;
  algrafLabel: string;
  dataFile: string;
  outputName: string;
  programPath: string;
  pdlSource: string;
  algrafSource: string;
  evidence: string[];
  conclusion: string;
}

export interface StoryMetric {
  label: string;
  value: string;
}

export const STORY_MARKDOWN_SOURCE = storyMarkdownSource;
export const STORY_PROGRAM_SOURCE = storyProgramSource;
export const STORY_PROGRAM_PATH = "memory/datafarm-bikeshare/story.pdl";

export const RAW_DATA = {
  trips: tripsRawCsv,
  stations: stationsCsv,
  weather: weatherDailyCsv,
};

export const HERO_METRICS: StoryMetric[] = [
  { label: "Valid rides", value: "47" },
  { label: "Member ride share", value: "66%" },
  { label: "Member revenue share", value: "39%" },
  { label: "Visitor revenue/ride", value: "3.0x" },
  { label: "Rain revenue loss", value: "~64%" },
];

export const STORY_STEPS: StoryStep[] = [
  {
    id: "daily-rider-trips",
    number: "01",
    title: "By the dashboard, we're a commuter app",
    question: "Who rides most?",
    summary:
      "Filter to real rides, count trips per day and rider type, and stack them. This is the chart the operator already has: members are a thick, steady band; visitors are thin and disappear on wet days.",
    pdlLabel: "daily-rider-trips.pdl",
    algrafLabel: "daily-rider-trips.ag",
    dataFile: "daily_rider_trips.csv",
    outputName: "daily_rider_trips",
    programPath: "memory/datafarm-bikeshare/01/daily-rider-trips.pdl",
    pdlSource: dailyRiderTripsPdl,
    algrafSource: dailyRiderTripsAlgraf,
    evidence: [
      "The valid set removes cancelled and maintenance rows before any count exists.",
      "The prepared output is one row per day and rider type, with revenue kept beside volume.",
      "Members are present every day; visitor rows are sparse and vanish on the rainy Apr 3 count.",
    ],
    conclusion:
      "Members are 66% of all rides and present every single day. Read the count alone and you green-light a commuter strategy, but the revenue column is already pointing somewhere else.",
  },
  {
    id: "duration-distance",
    number: "02",
    title: "Two businesses wearing one logo",
    question: "Are all rides the same kind of thing?",
    summary:
      "Plot every valid ride by distance and duration, colored by rider type and sized by fare. No join and no aggregation are needed for the point cloud to split in two.",
    pdlLabel: "valid-trips.pdl",
    algrafLabel: "duration-distance.ag",
    dataFile: "valid_trips.csv",
    outputName: "valid_trips",
    programPath: "memory/datafarm-bikeshare/02/valid-trips.pdl",
    pdlSource: validTripsPdl,
    algrafSource: durationDistanceAlgraf,
    evidence: [
      "The table keeps one row per completed ride and only the fields the scatterplot needs.",
      "Member rides sit low and left: shorter, cheaper, and more frequent.",
      "Visitor rides stretch up and right, and the larger fare dots sit with that smaller group.",
    ],
    conclusion:
      "This is one service running two products. Members own the count; the big dots belong to visitors. The next question is who owns the revenue.",
  },
  {
    id: "revenue-inversion",
    number: "03",
    title: "The count lies - follow the money",
    question: "Where does the revenue actually come from?",
    summary:
      "Collapse each rider type to share of rides and share of revenue, then draw a line between the two. If volume and value agreed, the lines would run flat.",
    pdlLabel: "revenue-inversion.pdl",
    algrafLabel: "revenue-inversion.ag",
    dataFile: "revenue_inversion.csv",
    outputName: "revenue_inversion",
    programPath: "memory/datafarm-bikeshare/03/revenue-inversion.pdl",
    pdlSource: revenueInversionPdl,
    algrafSource: revenueInversionAlgraf,
    evidence: [
      "Rider totals are joined to an all-riders total row so shares are computed from the source data.",
      "The output is reshaped long with `pivot_longer` so the slope chart can draw one line per rider type.",
      "Members fall from 66% of rides to 39% of revenue; visitors rise from 34% to 61%.",
    ],
    conclusion:
      "The lines cross. Visitor rides earn 3.0x a member ride, so sorting anything by trip count optimizes for the cheapest product in the building.",
  },
  {
    id: "weather-split",
    number: "04",
    title: "Rain taxes the riders who pay",
    question: "Is the high-value rider dependable?",
    summary:
      "Bucket days into Dry and Rain, then compare rides per day for each rider type. Per-day averages keep the ten dry days and four wet days honest.",
    pdlLabel: "weather-split.pdl",
    algrafLabel: "weather-split.ag",
    dataFile: "weather_split.csv",
    outputName: "weather_split",
    programPath: "memory/datafarm-bikeshare/04/weather-split.pdl",
    pdlSource: weatherSplitPdl,
    algrafSource: weatherSplitAlgraf,
    evidence: [
      "Weather is joined by `trip_date` only after the revenue inversion has exposed the high-value segment.",
      "Members barely dip from 2.3 to 2.0 rides per day across dry and rainy days.",
      "Visitors drop from 1.5 to 0.25 rides per day, which exposes the valuable revenue to weather.",
    ],
    conclusion:
      "A wet day's revenue falls by roughly two-thirds even though the trip count hardly moves. The exposed revenue is precisely the valuable revenue.",
  },
  {
    id: "dock-priority",
    number: "05",
    title: "The priority list",
    question: "Which docks do we defend first?",
    summary:
      "Join station capacity and rank every start station by revenue per dock, not by trips. A small station that earns a lot now outranks a big one that earns a little.",
    pdlLabel: "dock-priority.pdl",
    algrafLabel: "dock-priority.ag",
    dataFile: "dock_priority.csv",
    outputName: "dock_priority",
    programPath: "memory/datafarm-bikeshare/05/dock-priority.pdl",
    pdlSource: dockPriorityPdl,
    algrafSource: dockPriorityAlgraf,
    evidence: [
      "Station names and dock capacity come from the station lookup, not the trip export.",
      "The table ranks by revenue per dock, which turns the analysis into an operating order.",
      "River Park, Harbor Point, Museum Loop, and Marina Gate outrank the busiest commuter stations.",
    ],
    conclusion:
      "Busy was never the same as valuable. A bike missing from River Park costs roughly three times what a bike missing from Central Station does, so the rebalancing review starts with the small high-value docks.",
  },
];

export function createBikeShareFiles(
  tripsCsv: string,
  stationsCsvSource: string,
  weatherCsv: string,
): Record<string, string> {
  return {
    "trips_raw.csv": tripsCsv,
    "stations.csv": stationsCsvSource,
    "weather_daily.csv": weatherCsv,
    "data/trips_raw.csv": tripsCsv,
    "data/stations.csv": stationsCsvSource,
    "data/weather_daily.csv": weatherCsv,
    "../data/trips_raw.csv": tripsCsv,
    "../data/stations.csv": stationsCsvSource,
    "../data/weather_daily.csv": weatherCsv,
  };
}
