import bikeStoryMarkdownSource from "./datafarm-bikeshare/STORY.md?raw";
import bikeStoryProgramSource from "./datafarm-bikeshare/story.pdl?raw";
import dailyRiderTripsPdl from "./datafarm-bikeshare/01/daily-rider-trips.pdl?raw";
import dailyRiderTripsAlgraf from "./datafarm-bikeshare/01/daily-rider-trips.ag?raw";
import validTripsPdl from "./datafarm-bikeshare/02/valid-trips.pdl?raw";
import durationDistanceAlgraf from "./datafarm-bikeshare/02/duration-distance.ag?raw";
import revenueInversionPdl from "./datafarm-bikeshare/03/revenue-inversion.pdl?raw";
import revenueInversionAlgraf from "./datafarm-bikeshare/03/revenue-inversion.ag?raw";
import bikeWeatherSplitPdl from "./datafarm-bikeshare/04/weather-split.pdl?raw";
import bikeWeatherSplitAlgraf from "./datafarm-bikeshare/04/weather-split.ag?raw";
import dockPriorityPdl from "./datafarm-bikeshare/05/dock-priority.pdl?raw";
import dockPriorityAlgraf from "./datafarm-bikeshare/05/dock-priority.ag?raw";
import tripsRawCsv from "./datafarm-bikeshare/data/trips_raw.csv?raw";
import stationsCsv from "./datafarm-bikeshare/data/stations.csv?raw";
import bikeWeatherDailyCsv from "./datafarm-bikeshare/data/weather_daily.csv?raw";

import solarStoryMarkdownSource from "./datafarm-solar/STORY.md?raw";
import solarStoryProgramSource from "./datafarm-solar/story.pdl?raw";
import capacityByStatePdl from "./datafarm-solar/01/capacity-by-state.pdl?raw";
import capacityBubbleMapAlgraf from "./datafarm-solar/01/capacity-bubble-map.ag?raw";
import sunCapacityFactorPdl from "./datafarm-solar/02/sun-capacity-factor.pdl?raw";
import sunCapacityFactorAlgraf from "./datafarm-solar/02/sun-capacity-factor.ag?raw";
import capacityVsOutputRankPdl from "./datafarm-solar/03/capacity-vs-output-rank.pdl?raw";
import capacityVsOutputRankAlgraf from "./datafarm-solar/03/capacity-vs-output-rank.ag?raw";
import seasonalMixPdl from "./datafarm-solar/04/seasonal-mix.pdl?raw";
import seasonalPieMapAlgraf from "./datafarm-solar/04/seasonal-pie-map.ag?raw";
import outputPerMwPdl from "./datafarm-solar/05/output-per-mw.pdl?raw";
import outputPerMwAlgraf from "./datafarm-solar/05/output-per-mw.ag?raw";
import solarStateCsv from "./datafarm-solar/data/solar_state.csv?raw";
import solarSeasonalCsv from "./datafarm-solar/data/solar_seasonal.csv?raw";
import usCountiesGeoJson from "./datafarm-solar/data/us_counties.geojson?raw";
import statePointsCsv from "./datafarm-solar/04/state_points.csv?raw";

export type StoryId = "bikeshare" | "solar";
export type MethodIcon = "search" | "join" | "workflow" | "chart";
export type RawDataIcon = "bike" | "map" | "weather" | "sun" | "seasonal" | "geojson";
export type DataLanguage = "csv" | "json";

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
  supportingFiles?: Record<string, string>;
  supportingOutputs?: Array<{ outputName: string; dataFile: string }>;
}

export interface StoryMetric {
  label: string;
  value: string;
}

export interface StoryMethodStep {
  icon: MethodIcon;
  title: string;
  body: string;
}

export interface StoryGuideItem {
  title: string;
  body: string;
}

export interface RawDataFile {
  id: string;
  label: string;
  icon: RawDataIcon;
  source: string;
  modelPath: string;
  language: DataLanguage;
}

export interface StoryBundle {
  id: StoryId;
  slug: string;
  navLabel: string;
  brandSubtitle: string;
  storyMarkdownSource: string;
  storyProgramSource: string;
  storyProgramPath: string;
  hero: {
    eyebrow: string;
    headline: string;
    subhead: string;
    metricsAriaLabel: string;
    metrics: StoryMetric[];
  };
  rawData: {
    eyebrow: string;
    heading: string;
    copy: string;
    files: RawDataFile[];
  };
  methodSteps: StoryMethodStep[];
  steps: StoryStep[];
  guide: {
    eyebrow: string;
    heading: string;
    items: StoryGuideItem[];
  };
}

export const DEFAULT_STORY_ID: StoryId = "solar";

const SHARED_METHOD_STEPS: StoryMethodStep[] = [
  {
    icon: "search",
    title: "One question per table",
    body: "Each section prepares only the CSV its chart needs, so the claim stays easy to inspect.",
  },
  {
    icon: "join",
    title: "Context joins late",
    body: "Supporting data joins only when the next question needs it, after the first view exposes what is missing.",
  },
  {
    icon: "workflow",
    title: "Prepared outputs feed charts",
    body: "One PDL story program creates named CSV outputs, and each chart reads the file for its section.",
  },
  {
    icon: "chart",
    title: "Chart form matches the question",
    body: "Each chart type fits a different step in the decision, from the opening read to the ranked priority list.",
  },
];

export const STORY_BUNDLES: StoryBundle[] = [
  {
    id: "solar",
    slug: "datafarm-solar",
    navLabel: "Solar",
    brandSubtitle: "Sun vs subsidy story",
    storyMarkdownSource: solarStoryMarkdownSource,
    storyProgramSource: solarStoryProgramSource,
    storyProgramPath: "memory/datafarm-solar/story.pdl",
    hero: {
      eyebrow: "US solar case study",
      headline: "The state with the least solar makes the most power per panel.",
      subhead:
        "Eleven states, one table and one chart at a time. We start with installed megawatts, then compare that buildout with sunlight, seasons, and geography.",
      metricsAriaLabel: "Solar headline metrics",
      metrics: [
        { label: "States", value: "11" },
        { label: "Sun Belt capacity", value: "78%" },
        { label: "Sun Belt generation", value: "85%" },
        { label: "New Mexico", value: "Last MW, first yield" },
        { label: "Winter output", value: "27% vs 9%" },
      ],
    },
    rawData: {
      eyebrow: "Raw data",
      heading: "Two tables and a basemap",
      copy:
        "State-level capacity and seasonal generation are the measured sources. The county GeoJSON is the shared basemap used by the capacity bubbles and seasonal pies.",
      files: [
        {
          id: "solarState",
          label: "solar_state.csv",
          icon: "sun",
          source: solarStateCsv,
          modelPath: "solar_state.csv",
          language: "csv",
        },
        {
          id: "solarSeasonal",
          label: "solar_seasonal.csv",
          icon: "seasonal",
          source: solarSeasonalCsv,
          modelPath: "solar_seasonal.csv",
          language: "csv",
        },
        {
          id: "counties",
          label: "us_counties.geojson",
          icon: "geojson",
          source: usCountiesGeoJson,
          modelPath: "us_counties.geojson",
          language: "json",
        },
      ],
    },
    methodSteps: SHARED_METHOD_STEPS,
    steps: [
      {
        id: "capacity-by-state",
        number: "01",
        title: "Where we built the panels",
        question: "Where does US solar live?",
        summary:
          "Drop state capacity onto the county basemap as proportional bubbles. This is the starting view: where installed megawatts already sit.",
        pdlLabel: "capacity-by-state.pdl",
        algrafLabel: "capacity-bubble-map.ag",
        dataFile: "capacity_by_state.csv",
        outputName: "capacity_by_state",
        programPath: "memory/datafarm-solar/01/capacity-by-state.pdl",
        pdlSource: capacityByStatePdl,
        algrafSource: capacityBubbleMapAlgraf,
        evidence: [
          "The table keeps only state centroids, region, and installed capacity.",
          "Capacity clusters on both coasts and in Texas.",
          "New Mexico is last by installed MW, despite sitting in the strongest solar geography.",
        ],
        conclusion:
          "By installed megawatts, solar looks like a coastal-plus-Texas story. But a megawatt is a promise, not a kilowatt-hour.",
      },
      {
        id: "sun-capacity-factor",
        number: "02",
        title: "Capacity isn't electricity",
        question: "What decides how much a panel actually generates?",
        summary:
          "Derive capacity factor from generation and nameplate capacity, then plot it against peak sun hours. One derived column reframes the system.",
        pdlLabel: "sun-capacity-factor.pdl",
        algrafLabel: "sun-capacity-factor.ag",
        dataFile: "sun_capacity_factor.csv",
        outputName: "sun_capacity_factor",
        programPath: "memory/datafarm-solar/02/sun-capacity-factor.pdl",
        pdlSource: sunCapacityFactorPdl,
        algrafSource: sunCapacityFactorAlgraf,
        evidence: [
          "Capacity factor is derived in PDL, not stored in the raw state table.",
          "The dots line up with sun hours: more sun, more output per MW.",
          "The Sun Belt sits top-right while Snow Belt states sit bottom-left.",
        ],
        conclusion:
          "Two identical panels are not the same asset. New Mexico and Arizona turn each MW into roughly double the output of Massachusetts or New York.",
      },
      {
        id: "capacity-vs-output-rank",
        number: "03",
        title: "Ranked by panels, then by power",
        question: "Does the state order survive switching from buildout to yield?",
        summary:
          "Rank states by installed capacity, rank them again by output per MW, and connect each state's two positions. If the rankings agreed, the lines would run flat.",
        pdlLabel: "capacity-vs-output-rank.pdl",
        algrafLabel: "capacity-vs-output-rank.ag",
        dataFile: "capacity_vs_output_rank.csv",
        outputName: "capacity_vs_output_rank",
        programPath: "memory/datafarm-solar/03/capacity-vs-output-rank.pdl",
        pdlSource: capacityVsOutputRankPdl,
        algrafSource: capacityVsOutputRankAlgraf,
        evidence: [
          "The PDL uses window `rank() over (...)` to rank capacity and output per MW.",
          "New Mexico jumps from 11th by capacity to 1st by output per MW.",
          "Every rising line is Sun Belt; the Snow Belt lines fall.",
        ],
        conclusion:
          "The ranking flips. We poured megawatts into states that convert them poorly, while the highest-yield states are underbuilt.",
      },
      {
        id: "seasonal-mix",
        number: "04",
        title: "Winter tells the truth",
        question: "Is low-sun capacity dependable through the year?",
        summary:
          "Break each state's annual generation into Winter, Shoulder, and Summer, then map the mix as glyph pies sized by annual output.",
        pdlLabel: "seasonal-mix.pdl",
        algrafLabel: "seasonal-pie-map.ag",
        dataFile: "seasonal_generation.csv",
        outputName: "seasonal_generation",
        programPath: "memory/datafarm-solar/04/seasonal-mix.pdl",
        pdlSource: seasonalMixPdl,
        algrafSource: seasonalPieMapAlgraf,
        supportingFiles: {
          "state_points.csv": statePointsCsv,
        },
        supportingOutputs: [{ outputName: "state_points", dataFile: "state_points.csv" }],
        evidence: [
          "The seasonal table stays long: one state-season row per slice.",
          "The chart uses the bundled state points table to place each glyph pie.",
          "Sun Belt winter generation is a much larger share than Snow Belt winter generation.",
        ],
        conclusion:
          "The low-sun fleet is seasonal as well as smaller per panel. It fades in winter, exactly when demand pressure can rise.",
      },
      {
        id: "output-per-mw",
        number: "05",
        title: "Where the next megawatt pays off",
        question: "If we can build one more MW anywhere, where does it earn the most power?",
        summary:
          "Rank every state by output per installed MW, not by how much capacity it already has. This turns the analysis into a siting list.",
        pdlLabel: "output-per-mw.pdl",
        algrafLabel: "output-per-mw.ag",
        dataFile: "output_per_mw.csv",
        outputName: "output_per_mw",
        programPath: "memory/datafarm-solar/05/output-per-mw.pdl",
        pdlSource: outputPerMwPdl,
        algrafSource: outputPerMwAlgraf,
        evidence: [
          "Generation per MW is derived in PDL from raw generation and capacity.",
          "New Mexico, Arizona, and Nevada top the priority list.",
          "Massachusetts, Minnesota, and New York sit at the bottom.",
        ],
        conclusion:
          "The capacity map is almost the inverse of the siting list. We built where the incentives were; the sun is still waiting in the Southwest.",
      },
    ],
    guide: {
      eyebrow: "Payoff",
      heading: "Megawatts are not electricity",
      items: [
        {
          title: "Capacity misleads",
          body: "Installed MW shows ambition, but not how much power those panels actually produce.",
        },
        {
          title: "Sun sets yield",
          body: "Output per panel follows sunlight, which scrambles the capacity ranking.",
        },
        {
          title: "Siting becomes clear",
          body: "The next MW belongs where output per MW is highest, not where the buildout is already largest.",
        },
      ],
    },
  },
  {
    id: "bikeshare",
    slug: "datafarm-bikeshare",
    navLabel: "Bikeshare",
    brandSubtitle: "Urban bike-share story",
    storyMarkdownSource: bikeStoryMarkdownSource,
    storyProgramSource: bikeStoryProgramSource,
    storyProgramPath: "memory/datafarm-bikeshare/story.pdl",
    hero: {
      eyebrow: "Urban bike-share case study",
      headline: "Two-thirds of the rides. Less than two-fifths of the money.",
      subhead:
        "Forty-seven valid April rides, built up one table and one chart at a time. We begin with the trip counts an operator already watches, then add station and weather context only when a question forces it.",
      metricsAriaLabel: "Bike-share headline metrics",
      metrics: [
        { label: "Valid rides", value: "47" },
        { label: "Member ride share", value: "66%" },
        { label: "Member revenue share", value: "39%" },
        { label: "Visitor revenue/ride", value: "3.0x" },
        { label: "Rain revenue loss", value: "~64%" },
      ],
    },
    rawData: {
      eyebrow: "Raw data",
      heading: "Three sources, joined on purpose",
      copy:
        "The trip export carries 49 rows: 47 completed rides plus one cancelled and one maintenance row. Stations and weather stay separate until a section needs them.",
      files: [
        {
          id: "trips",
          label: "trips_raw.csv",
          icon: "bike",
          source: tripsRawCsv,
          modelPath: "trips_raw.csv",
          language: "csv",
        },
        {
          id: "stations",
          label: "stations.csv",
          icon: "map",
          source: stationsCsv,
          modelPath: "stations.csv",
          language: "csv",
        },
        {
          id: "weather",
          label: "weather_daily.csv",
          icon: "weather",
          source: bikeWeatherDailyCsv,
          modelPath: "weather_daily.csv",
          language: "csv",
        },
      ],
    },
    methodSteps: [
      SHARED_METHOD_STEPS[0],
      {
        icon: "join",
        title: "Context joins late",
        body: "Stations and weather join only when the next question needs them, after trip counts expose the first misread.",
      },
      SHARED_METHOD_STEPS[2],
      {
        icon: "chart",
        title: "Chart form matches the question",
        body: "Area, scatter, slope, grouped bars, and ranked bars each fit a different step in the decision.",
      },
    ],
    steps: [
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
          "This is one service running two products. Members dominate the count; the big dots belong to visitors. The next question is where the revenue lands.",
      },
      {
        id: "revenue-inversion",
        number: "03",
        title: "The count misleads - follow the money",
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
        pdlSource: bikeWeatherSplitPdl,
        algrafSource: bikeWeatherSplitAlgraf,
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
    ],
    guide: {
      eyebrow: "Payoff",
      heading: "Busy is not the same as valuable",
      items: [
        {
          title: "Counts mislead",
          body: "Member rides dominate the dashboard, but visitor rides carry most of the money.",
        },
        {
          title: "Revenue is exposed",
          body: "The high-value segment is weather-shy, so rainy days cut revenue harder than trip count.",
        },
        {
          title: "Docks become decisions",
          body: "The ranked output identifies the small stations where a missing bike costs the most.",
        },
      ],
    },
  },
];

export function getStoryBundle(id: StoryId): StoryBundle {
  return STORY_BUNDLES.find((story) => story.id === id) ?? STORY_BUNDLES[0];
}

export function createDefaultRawDataByStory(): Record<StoryId, Record<string, string>> {
  return Object.fromEntries(
    STORY_BUNDLES.map((story) => [
      story.id,
      Object.fromEntries(story.rawData.files.map((file) => [file.id, file.source])),
    ]),
  ) as Record<StoryId, Record<string, string>>;
}

export function createDefaultSourcesByStory(kind: "pdl" | "algraf"): Record<StoryId, Record<string, string>> {
  return Object.fromEntries(
    STORY_BUNDLES.map((story) => [
      story.id,
      Object.fromEntries(story.steps.map((step) => [step.id, kind === "pdl" ? step.pdlSource : step.algrafSource])),
    ]),
  ) as Record<StoryId, Record<string, string>>;
}

export function createStoryFiles(story: StoryBundle, rawSources: Record<string, string>): Record<string, string> {
  const files: Record<string, string> = {};
  for (const rawFile of story.rawData.files) {
    const source = rawSources[rawFile.id] ?? rawFile.source;
    files[rawFile.label] = source;
  }
  return files;
}
