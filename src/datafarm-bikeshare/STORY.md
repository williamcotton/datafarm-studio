# Datafarm Studio — Urban Bike-Share

**PDL preparation + Algraf visualization, told as one argument.**

> One claim runs through all five steps: **the rides this operator counts are not
> the rides that earn.** Each step is a different chart form, because each beat is a
> different shape of argument — accumulation, separation, inversion, comparison, a
> ranked list. Every number below is computed from `trips_raw.csv`; nothing is
> asserted by hand.

---

## Hero copy (top of page)

**Eyebrow:** URBAN BIKE-SHARE CASE STUDY

**Headline:** Two-thirds of the rides. Less than two-fifths of the money.

**Subhead:** Forty-seven valid April rides, built up one table and one chart at a
time. We begin with the trip counts an operator already watches, then add station
and weather context only when a question forces it — following a single thread to a
decision about which docks to defend.

**Stat strip:**
- VALID RIDES — 47
- MEMBER SHARE OF RIDES — 66%
- MEMBER SHARE OF REVENUE — 39%
- VISITOR REVENUE PER RIDE — 3.0× members
- REVENUE LOST ON A RAIN DAY — ~64%

**Per step:** PDL editor → Algraf editor → prepared output → rendered chart. Every
claim is traceable from source CSV to SVG.

---

## Raw data — three sources, joined on purpose

- `trips_raw.csv` — 49 rows. 47 completed rides plus one cancelled and one maintenance row that must be filtered before any metric exists.
- `stations.csv` — 10 docks with zone, capacity, opened year.
- `weather_daily.csv` — 14 days of temperature, precipitation, wind, condition.

Stations join in Step 4’s neighbour and again in Step 5; weather joins in Step 4.
Nothing joins before the trip counts have set the trap.

---

# 01 · By the dashboard, we're a commuter app

**Question:** Who rides most?

**Setup:** Filter to real rides, count trips per day and rider type, and stack them.
This is the chart the operator already has. Members are a thick, steady band;
visitors are a thin one that vanishes on wet days.

### PDL — `daily-rider-trips.pdl`
```pdl
let cleaned =
  load "trips_raw.csv"
  | filter lower(trim("status")) == lit("completed")
  | select
      "trip_id", "trip_date", "rider_type", "pass_type", "bike_type",
      "start_station_id", "end_station_id",
      "duration_min", "distance_km", "fare_usd"
  | sort "trip_date", "trip_id"

cleaned
  | group_by "trip_date", "rider_type"
  | agg count() as "trips", sum("fare_usd") as "revenue"
  | mutate "revenue" = round("revenue", 2)
  | sort "trip_date", "rider_type"
  | save "daily_rider_trips.csv"
```

### Algraf — `daily-rider-trips.ag`  *(stacked area)*
```algraf
Chart(
    data: "daily_rider_trips.csv",
    width: 760,
    height: 420,
    title: "By the dashboard, we're a commuter app",
    caption: "Stacked daily trips. By volume the service looks like a member commuter app - that read is the trap."
) {
    Theme(name: "minimal")
    Parse(column: trip_date, as: "date", format: "%Y-%m-%d")
    Scale(fill: rider_type, palette: "accent", label: "Rider type")
    Scale(axis: y, domain: [0, 5], breaks: [0, 1, 2, 3, 4, 5], expand: [0, 0])
    Guide(axis: x, label: "Date", timeFormat: "%b %-d", tickLabelRows: 2)
    Guide(axis: y, label: "Trips per day")
    Space(trip_date * trips) {
        Area(fill: rider_type, layout: "stack", alpha: 0.85)
        Text(x: date("2026-04-09"), y: 1.3, label: "members: a thick, steady band", anchor: "middle", fill: "#f7f7f7", size: 10)
        Text(x: date("2026-04-06"), y: 4.2, label: "visitors: thin, gone on rain days", anchor: "middle", fill: "#666666", size: 10)
    }
}
```

### Prepared output — `daily_rider_trips.csv` (25 rows)
```
trip_date,rider_type,trips,revenue
2026-04-01,member,3,13.85
2026-04-01,visitor,2,33.13
2026-04-03,member,2,8.35          <- rain day: no visitor row at all
2026-04-09,member,3,14.57
2026-04-09,visitor,1,17.48
...  (25 rows total)
```

**Conclusion:** Members are 66% of all rides and present every single day. Read the
count alone and you green-light a commuter strategy. *But the revenue column is
already whispering otherwise — two visitor rides on Apr 1 out-earn three member
rides. Are these even the same kind of trip?*

---

# 02 · Two businesses wearing one logo

**Question:** Are all rides the same kind of thing?

**Setup:** Plot every ride by distance and duration, coloured by rider, sized by
fare. No join, no aggregation — just the rides. The point cloud splits in two.

### PDL — `valid-trips.pdl`
```pdl
let cleaned =
  load "trips_raw.csv"
  | filter lower(trim("status")) == lit("completed")
  | select
      "trip_id", "trip_date", "rider_type", "pass_type", "bike_type",
      "start_station_id", "end_station_id",
      "duration_min", "distance_km", "fare_usd"
  | sort "trip_date", "trip_id"

cleaned
  | select
      "trip_id", "trip_date", "rider_type", "bike_type",
      "duration_min", "distance_km", "fare_usd"
  | save "valid_trips.csv"
```

### Algraf — `duration-distance.ag`  *(scatter)*
```algraf
Chart(
    data: "valid_trips.csv",
    width: 760,
    height: 430,
    title: "Two businesses wearing one logo",
    caption: "Each dot is one ride; size is fare. Two clusters separate before any join, and the upper cluster is the pricey one."
) {
    Theme(name: "minimal")
    Scale(fill: rider_type, palette: "accent", label: "Rider type")
    Scale(size: fare_usd,
          range: [3, 11],
          breaks: [5, 10, 15],
          labels: ["$5", "$10", "$15"],
          label: "Fare")
    Guide(axis: x, label: "Distance (km)")
    Guide(axis: y, label: "Duration (min)")
    Space(distance_km * duration_min) {
        Point(fill: rider_type, size: fare_usd, alpha: 0.74,
              tooltip: [trip_id, trip_date, rider_type, bike_type, fare_usd],
              highlight: rider_type)
        Text(x: 4.6, y: 22, label: "members: short, cheap, frequent", anchor: "start", fill: "#666666", size: 10)
        Text(x: 12.5, y: 62, label: "visitors: long, expensive, rare", anchor: "end", fill: "#666666", size: 10)
    }
}
```

### Prepared output — `valid_trips.csv` (47 rows)
```
trip_id,trip_date,rider_type,bike_type,duration_min,distance_km,fare_usd
T1001,2026-04-01,member,classic,13,4.1,3.99
T1004,2026-04-01,visitor,classic,64,13.5,16.1
T1005,2026-04-01,visitor,ebike,53,12.4,17.03
...  (47 rows total)
```

**Conclusion:** Two clusters, no overlap. Members sit low and left — under 6 km,
under half an hour, small dots. Visitors stretch up and right — long, far, and the
dots are visibly bigger. This is one service running two products. *Members own the
count; the big dots belong to visitors. So who owns the revenue?*

---

# 03 · The count lies — follow the money

**Question:** Where does the revenue actually come from?

**Setup:** Collapse each rider type to two numbers — its share of rides and its
share of revenue — and draw a line between them. If volume and value agreed, the
lines would run flat. They don't.

### PDL — `revenue-inversion.pdl`
```pdl
let cleaned =
  load "trips_raw.csv"
  | filter lower(trim("status")) == lit("completed")
  | select "rider_type", "fare_usd"

let by_rider =
  cleaned
  | group_by "rider_type"
  | agg count() as "trips", sum("fare_usd") as "revenue"
  | mutate "revenue" = round("revenue", 2)

let totals =
  by_rider
  | agg sum("trips") as "total_trips", sum("revenue") as "total_revenue"
  | mutate "join_key" = lit("all")

by_rider
  | mutate "join_key" = lit("all")
  | join totals on "join_key"
  | mutate
      "Share of rides" = round(100 * "trips" / "total_trips", 2),
      "Share of revenue" = round(100 * "revenue" / "total_revenue", 2)
  | pivot_longer "Share of rides", "Share of revenue" names_to "metric" values_to "share"
  | mutate "value" = if_else("metric" == lit("Share of rides"), "trips", "revenue")
  | select "rider_type", "metric", "share", "value"
  | sort "rider_type", "metric" desc
  | save "revenue_inversion.csv"
```

### Algraf — `revenue-inversion.ag`  *(slope chart)*
```algraf
Chart(
    data: "revenue_inversion.csv",
    width: 680,
    height: 440,
    marginRight: 120,
    title: "The count lies: a third of rides, most of the money",
    caption: "Each line is a rider type. The lines cross: members fall from 66% of rides to 39% of revenue; visitors rise from 34% to 61%."
) {
    Theme(name: "minimal")
    Scale(stroke: rider_type, palette: "accent", label: "Rider type")
    Scale(fill: rider_type, palette: "accent")
    Scale(axis: x, domain: ["Share of rides", "Share of revenue"])
    Scale(axis: y, domain: [0, 70], breaks: [0, 20, 40, 60],
          labels: ["0%", "20%", "40%", "60%"], expand: [0.02, 0.05])
    Guide(axis: x, label: null)
    Guide(axis: y, label: "Share of total")
    Guide(legend: false)
    Space(metric * share) {
        Line(stroke: rider_type, strokeWidth: 3, alpha: 0.9, group: rider_type)
        Point(fill: rider_type, size: 7)
        Label(label: rider_type, at: "end", group: rider_type, dx: 35, fill: rider_type)
    }
}
```

### Prepared output — `revenue_inversion.csv` (4 rows)
```
rider_type,metric,share,value
member,Share of rides,65.96,31
member,Share of revenue,39.01,147.66
visitor,Share of rides,34.04,16
visitor,Share of revenue,60.99,230.9
```

**Conclusion (the payoff):** The lines cross. Members fall from **66% of rides to 39%
of revenue**; visitors climb from **34% to 61%**. The smaller crowd carries the
larger half of the money — visitor rides earn 3.0× a member ride. Sorting anything
by trip count optimizes for the cheapest product in the building. *So the business
leans on a minority segment. In Step 1 that segment looked weather-shy. Is the
revenue dependable, or one bad week from gone?*

---

# 04 · Rain taxes the riders who pay

**Question:** Is the high-value rider dependable?

**Setup:** Bucket days into Dry and Rain, then compare rides *per day* for each rider
type (per-day averages, because there are 10 dry days and only 4 wet ones). The two
populations respond to weather in opposite ways.

### PDL — `weather-split.pdl`
```pdl
let cleaned =
  load "trips_raw.csv"
  | filter lower(trim("status")) == lit("completed")
  | select "trip_id", "trip_date", "rider_type", "fare_usd"
  | sort "trip_date", "trip_id"

let weather =
  load "weather_daily.csv"
  | select "trip_date", "condition"
  | mutate "weather" = if_else("condition" == lit("rain"), lit("Rain"), lit("Dry"))
  | select "trip_date", "weather"

let weather_days =
  weather
  | group_by "weather"
  | agg count_distinct("trip_date") as "days"

let trips_by_weather =
  cleaned
  | join weather on "trip_date"
  | group_by "weather", "rider_type"
  | agg count() as "trips", sum("fare_usd") as "revenue"
  | mutate "revenue" = round("revenue", 2)

trips_by_weather
  | join weather_days on "weather"
  | mutate "avg_per_day" = round("trips" / "days", 2)
  | sort "weather", "rider_type"
  | select "weather", "rider_type", "days", "trips", "avg_per_day", "revenue"
  | save "weather_split.csv"
```

### Algraf — `weather-split.ag`  *(grouped bars)*
```algraf
Chart(
    data: "weather_split.csv",
    width: 700,
    height: 430,
    title: "Rain taxes the riders who pay",
    caption: "Per-day rides by day type: members hold, visitors collapse."
) {
    Theme(name: "minimal")
    Scale(fill: rider_type, palette: "accent", label: "Rider type")
    Scale(axis: x, domain: ["Dry", "Rain"])
    Scale(axis: y, domain: [0, 2.6], breaks: [0, 0.5, 1, 1.5, 2, 2.5], expand: [0, 0])
    Guide(axis: x, label: "Day type")
    Guide(axis: y, label: "Rides per day")
    Space(weather / rider_type * avg_per_day) {
        Bar(fill: rider_type, alpha: 0.86,
            tooltip: [weather, rider_type, days, trips, avg_per_day, revenue])
        Text(label: avg_per_day, format: ".2f", dy: -8, anchor: "middle", size: 10)
    }
}
```

### Prepared output — `weather_split.csv` (4 rows)
```
weather,rider_type,days,trips,avg_per_day,revenue
Dry,member,10,23,2.3,110.21
Dry,visitor,10,15,1.5,220.61
Rain,member,4,8,2.0,37.45
Rain,visitor,4,1,0.25,10.29
```

**Conclusion:** Commuters ride through the rain — members barely dip, 2.3 to 2.0 rides
a day. The leisure rider stays home — visitors crater, 1.5 to 0.25, an 83% drop. So a
wet day's revenue falls by roughly two-thirds even though the *trip count* hardly
moves. The exposed revenue is precisely the valuable revenue. That makes this an
availability problem: keep bikes where the few high-value riders look for them. *On a
clear day, where exactly is that?*

---

# 05 · The priority list

**Question:** Which docks do we defend first?

**Setup:** Join station capacity, then rank every start station by revenue per dock —
not by trips. A small station that earns a lot now outranks a big one that earns a
little. The exploration becomes an ordered action list.

### PDL — `dock-priority.pdl`
```pdl
let cleaned =
  load "trips_raw.csv"
  | filter lower(trim("status")) == lit("completed")
  | select "trip_id", "start_station_id", "fare_usd"

let stations =
  load "stations.csv"
  | select "station_id", "station_name", "zone", "capacity"

cleaned
  | join stations on ("start_station_id", "station_id")
  | group_by "station_name", "zone", "capacity"
  | agg count() as "trips", sum("fare_usd") as "revenue"
  | mutate "revenue" = round("revenue", 2)
  | mutate "rev_per_dock" = round("revenue" / to_number("capacity"), 2)
  | sort "rev_per_dock" desc
  | select "station_name", "zone", "capacity", "trips", "revenue", "rev_per_dock"
  | save "dock_priority.csv"
```

### Algraf — `dock-priority.ag`  *(ranked horizontal bars)*
```algraf
Chart(
    data: "dock_priority.csv",
    width: 740,
    height: 470,
    marginLeft: 170,
    marginRight: 80,
    title: "The priority list: where a missing bike costs the most",
    caption: "Ranked by revenue per dock: review the small high-value stations first."
) {
    Theme(name: "minimal")
    Scale(fill: zone, palette: "accent", label: "Zone")
    Scale(axis: x, domain: [0, 4], breaks: [0, 1, 2, 3, 4],
          labels: ["$0", "$1", "$2", "$3", "$4"], expand: [0, 0.02])
    Scale(axis: y, domain: ["Market Hall", "Science Center", "North Campus", "Library Plaza", "Central Station", "Marina Gate", "Museum Loop", "Harbor Point", "River Park"])
    Guide(axis: x, label: "Revenue per dock")
    Guide(axis: y, label: null)
    Space(rev_per_dock * station_name) {
        Bar(fill: zone, layout: "stack", alpha: 0.86,
            tooltip: [station_name, zone, capacity, trips, revenue, rev_per_dock])
        Text(label: rev_per_dock, dx: 6, anchor: "start", format: "$.2f", size: 10)
    }
}
```

### Prepared output — `dock_priority.csv` (9 rows)
```
station_name,zone,capacity,trips,revenue,rev_per_dock
River Park,Riverfront,22,5,81.29,3.70
Harbor Point,Riverfront,16,3,42.46,2.65
Museum Loop,Cultural,30,5,65.58,2.19
Marina Gate,Riverfront,20,3,41.57,2.08
Central Station,Downtown,32,9,39.93,1.25
Library Plaza,Downtown,28,7,34.69,1.24
North Campus,Campus,24,6,27.32,1.14
Science Center,Campus,18,4,19.20,1.07
Market Hall,Market,26,5,26.52,1.02
```

**Conclusion (the decision):** Central Station leads the network in trips and finishes
near the *bottom* by revenue per dock. The top four — River Park, Harbor Point, Museum
Loop, Marina Gate — are the small Riverfront and Cultural stations the count view
ignored entirely. A bike missing from River Park costs roughly **three times** what a
bike missing from Central Station does. That is the rebalancing review order. **Busy
was never the same as valuable — and now the operator knows which 16-dock station to
check first on a clear Saturday morning.**

---

## Method — what this studio demonstrates

- **One question per table.** Each PDL program emits the smallest table its chart needs.
- **Context joins late.** Stations and weather are joined only at the step that needs them, after the counts have set up the misread.
- **The chart form is part of the argument.** Accumulation → area; separation → scatter; inversion → slope; comparison under a condition → grouped bars; a decision → a ranked list.
- **Every step turns the last answer into the next question.** Counts mislead → rides split → revenue inverts → that revenue is exposed → defend these specific docks. Reorder them and the argument breaks.

**The payoff, in one line:** the rides an operator instinctively counts are the cheap
ones; the money is a smaller, weather-exposed, geographically concentrated segment — so
the right move is defending a handful of small docks, not chasing volume.

---

## Note on the DSL surface used

This rebuild uses the current PDL surface implemented in this workspace:

- **PDL:** `mutate`, `save`, aggregate items in `function(...) as "column"` form, `round(value, digits)`, `count_distinct`, `pivot_longer`, `if_else`, and tuple join keys such as `join stations on ("start_station_id", "station_id")`. Column-total calculations are expressed through helper bindings and joins rather than aggregate calls inside ordinary row expressions.
- **Algraf:** the chart snippets above use current Algraf syntax: stacked area via `Area(layout: "stack")`, grouped bars via nested algebra, horizontal bars via `Space(value * category)`, terminal labels via `Label(label:, at:, group:)`, chart captions via `caption:`, and numeric labels via `Text(format:)`. Ranking stays in the prepared table; the dock chart preserves that order with an explicit categorical y-domain rather than chart-side data sorting.
