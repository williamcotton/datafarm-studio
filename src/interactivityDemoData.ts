import type { DashboardContext } from "./studioTypes";

export const INTERACTIVITY_PDL_PATH = "memory/interactivity/reactive-dashboard.pdl";
export const INTERACTIVITY_DATA_PATH = "reactive_trips.csv";
export const ZONE_SUMMARY_PATH = "zone_summary.csv";
export const ACTIVE_RANKINGS_PATH = "active_rankings.csv";
export const ALGRAF_MARK_SNAP_RADIUS_PX = 44;

export const DEFAULT_DASHBOARD_CONTEXT: DashboardContext = {
  time_cutoff: 18,
  active_fleet: "all",
  selected_zone: "Riverfront",
  metric_column: "revenue",
  priority_only: false,
};

export const FLEET_OPTIONS = ["all", "bus", "rail", "tram"];
export const ZONE_OPTIONS = ["Riverfront", "Market", "Uptown", "Industrial"];
export const METRIC_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "duration_min", label: "Duration" },
];

export const INTERACTIVITY_DATA = `zone,station,fleet,hour,revenue,duration_min,priority
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

export const INTERACTIVITY_PDL_SOURCE = `param time_cutoff = 18
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

export const SELECTOR_ALGRAF_SOURCE = `Chart(data: "zone_summary.csv", width: 760, height: 420, title: "Zone selector") {
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

export const RECEIVER_ALGRAF_SOURCE = `Chart(data: "active_rankings.csv", width: 760, height: 420, title: "Selected zone stations") {
    Theme(name: "minimal")
    Scale(fill: station, palette: "accent")
    Guide(axis: x, label: "Station")
    Guide(axis: y, label: "Selected metric")

    Space(station * total) {
        Bar(fill: station, layout: "stack", tooltip: [station, total, trips])
    }
}
`;
