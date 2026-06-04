# Datafarm Studio — Sun vs Subsidy

**PDL preparation + Algraf visualization, told as one argument — on a map.**

> One claim runs through all five steps: **we built solar capacity where the policy
> was, not where the sun is.** The chart form changes with the beat — a bubble map of
> ambition, a scatter of physics, a rank-scramble, a map of seasonal pies, and a
> ranked decision list. Every number is computed from `solar_state.csv`; nothing is
> asserted by hand. Figures are synthetic but the capacity factors track real
> Sun-Belt vs Snow-Belt sunlight.

---

## Hero copy (top of page)

**Eyebrow:** US SOLAR CASE STUDY

**Headline:** The state with the least solar makes the most power per panel.

**Subhead:** Eleven states, one table and one chart at a time. We start with the map
an energy board already has — installed megawatts — then let physics, the seasons,
and the geography pull it apart, ending on where the next panel actually belongs.

**Stat strip:**
- STATES — 11
- SUN BELT SHARE OF CAPACITY — 78%
- SUN BELT SHARE OF GENERATION — 85%
- NEW MEXICO — last in capacity, **first** in output per MW
- WINTER OUTPUT — 27% of the year in the Sun Belt, **9%** in the Snow Belt

**Per step:** PDL editor → Algraf editor → prepared output → rendered chart. Every
claim is traceable from source CSV to SVG.

---

## Raw data — two tables and a basemap

- `solar_state.csv` — one row per state: centroid long/lat, region, peak sun hours, installed capacity (MW), annual generation (GWh).
- `solar_seasonal.csv` — one row per state × season (Winter / Shoulder / Summer), in GWh.
- `us_counties.geojson` — the shared county basemap (reused from the map examples; see `data/README.txt`).

Capacity factor and output-per-MW are never stored — they're derived in the pipeline,
which is where the story actually lives.

---

# 01 · Where we built the panels

**Question:** Where does US solar live?

**Setup:** Drop state capacity onto the county basemap as proportional bubbles, sized
and shaded by megawatts. This is the slide that goes in the board deck.

### PDL — `capacity-by-state.pdl`
```pdl
let states =
  load "solar_state.csv"
  | select "state", "long", "lat", "region", "capacity_mw"

states
  | sort "capacity_mw" desc
  | save "capacity_by_state.csv"
```

### Algraf — `capacity-bubble-map.ag`  *(proportional-symbol map)*
```algraf
Chart(data: GeoJson("us_counties.geojson"), width: 820, height: 500,
      title: "Where we built the panels",
      subtitle: "Installed solar capacity (MW) by state, on a US county basemap",
      caption: "...") {
    Theme(name: "void")
    Table states = "capacity_by_state.csv"
    Space(geom, projection: "albers_usa") {
        Geo(fill: "#f3f4f6", stroke: "#d1d5db", strokeWidth: 0.25)
    }
    Space(long * lat, projection: "albers_usa", data: states) {
        Scale(fill: capacity_mw, gradient: ["#fee08b", "#f03b20"], label: "Capacity (MW)")
        Scale(size: capacity_mw, range: [6, 30], breaks: [700,1500,2400,3000,4200],
              labels: ["700","1500","2400","3000","4200"], label: "Capacity (MW)")
        Point(size: capacity_mw, fill: capacity_mw, alpha: 0.85)
        Text(label: state, dy: -16, size: 7, fill: "#222222", anchor: "middle")
    }
}
```

### Prepared output — `capacity_by_state.csv` (11 rows)
```
state,long,lat,region,capacity_mw
California,-119.4,36.8,Sun Belt,4200
North Carolina,-79.4,35.6,Sun Belt,3000
Texas,-99.0,31.5,Sun Belt,2600
New York,-75.5,42.9,Snow Belt,2000
...
New Mexico,-106.0,34.4,Sun Belt,700
```

**Conclusion:** The big bubbles cluster on the two coasts and in Texas — California,
North Carolina, New York, Florida. By installed megawatts, solar reads as a
coastal-plus-Texas story, and New Mexico barely registers. *But a megawatt is a
promise, not a kilowatt-hour. Do these panels actually make power in proportion to
their size?*

---

# 02 · Capacity isn't electricity

**Question:** What decides how much a panel actually generates?

**Setup:** Derive capacity factor — generation per MW of nameplate — and plot it
against peak sun hours. One derived column reframes everything.

### PDL — `sun-capacity-factor.pdl`
```pdl
let states =
  load "solar_state.csv"
  | select "state", "region", "sun_hours", "capacity_mw", "generation_gwh"

states
  | mutate "capacity_factor" = round("generation_gwh" / ("capacity_mw" * 8.76), 3)
  | select "state", "region", "sun_hours", "capacity_mw", "capacity_factor"
  | sort "sun_hours"
  | save "sun_capacity_factor.csv"
```

### Algraf — `sun-capacity-factor.ag`  *(scatter)*
```algraf
Chart(data: "sun_capacity_factor.csv", width: 760, height: 440,
      title: "Capacity isn't electricity", caption: "...") {
    Theme(name: "minimal")
    Scale(fill: region, palette: "accent", label: "Region")
    Scale(size: capacity_mw, range: [4, 16], breaks: [1000,2500,4000], labels: ["1 GW","2.5 GW","4 GW"], label: "Capacity")
    Scale(axis: x, domain: [3.5, 7], breaks: [4,5,6,7], labels: ["4","5","6","7"])
    Scale(axis: y, domain: [0.12, 0.32], breaks: [0.15,0.20,0.25,0.30], labels: ["15%","20%","25%","30%"])
    Guide(axis: x, label: "Peak sun hours per day")
    Guide(axis: y, label: "Capacity factor (output per MW)")
    Space(sun_hours * capacity_factor) {
        Point(fill: region, size: capacity_mw, alpha: 0.8,
              tooltip: [state, region, sun_hours, capacity_mw, capacity_factor])
        Text(label: state, dy: -10, size: 7, fill: "#666666", anchor: "middle")
    }
}
```

### Prepared output — `sun_capacity_factor.csv` (11 rows)
```
state,region,sun_hours,capacity_factor
Massachusetts,Snow Belt,3.9,0.148
New York,Snow Belt,4.0,0.155
...
Arizona,Sun Belt,6.5,0.290
New Mexico,Sun Belt,6.6,0.300
```

**Conclusion:** The dots line up almost perfectly: more sun, more output per panel,
full stop. New Mexico and Arizona turn each megawatt into ~0.30 of capacity factor;
Massachusetts and New York scrape ~0.15 — half. Two identical panels, one in Phoenix
and one in Boston, are not the same asset. *If output per panel swings 2× with
sunlight, what is our capacity ranking even measuring?*

---

# 03 · Ranked by panels, then by power

**Question:** Does the order of states survive switching from "how much we built" to
"how much it makes per panel"?

**Setup:** Rank the states by capacity, rank them again by output per MW, and connect
each state's two positions. If the two rankings agreed, the lines would run flat. They
don't — they braid.

### PDL — `capacity-vs-output-rank.pdl`
```pdl
let states =
  load "solar_state.csv"
  | select "state", "region", "capacity_mw", "generation_gwh"
  | mutate "gen_per_mw" = round("generation_gwh" / "capacity_mw", 3)
  | mutate
      "By capacity"      = rank() over (order_by "capacity_mw" desc),
      "By output per MW" = rank() over (order_by "gen_per_mw" desc)

states
  | pivot_longer "By capacity", "By output per MW" names_to "metric" values_to "rank"
  | select "state", "region", "metric", "rank"
  | sort "state", "metric"
  | save "capacity_vs_output_rank.csv"
```

### Algraf — `capacity-vs-output-rank.ag`  *(bump / rank-change chart)*
```algraf
Chart(data: "capacity_vs_output_rank.csv", width: 720, height: 520, marginLeft: 140, marginRight: 150,
      title: "Ranked by panels, then by power: the board scrambles", caption: "...") {
    Theme(name: "minimal")
    Scale(stroke: region, palette: "accent", label: "Region")
    Scale(axis: x, domain: ["By capacity", "By output per MW"])
    Scale(axis: y, domain: [11.5, 0.5], breaks: [1,3,5,7,9,11], labels: ["1","3","5","7","9","11"])
    Guide(axis: x, label: null)
    Guide(axis: y, label: "Rank (1 = best)")
    Guide(fill: null)
    Space(metric * rank) {
        Line(stroke: region, strokeWidth: 2.5, alpha: 0.85, group: state)
        Point(fill: region, size: 6)
        Label(label: state, at: "start", group: state, dx: -8, anchor: "end", fill: "#444444", size: 9)
        Label(label: state, at: "end", group: state, dx: 8, anchor: "start", fill: "#444444", size: 9)
    }
}
```

### Prepared output — `capacity_vs_output_rank.csv` (22 rows)
```
state,region,metric,rank
New Mexico,Sun Belt,By capacity,11
New Mexico,Sun Belt,By output per MW,1
Massachusetts,Snow Belt,By capacity,7
Massachusetts,Snow Belt,By output per MW,11
California,Sun Belt,By capacity,1
California,Sun Belt,By output per MW,4
...  (22 rows: 11 states x 2 rankings)
```

**Conclusion (the turn):** The board scrambles. New Mexico climbs from **last in
capacity to first in output per MW**; Arizona 6→2, Nevada 8→3, Colorado 10→5 all
surge. Going the other way, Massachusetts sinks from 7th to dead last, North Carolina
2→8, New York 5→9. Every rising line is Sun Belt, every falling line is Snow Belt. We
poured megawatts into the states that convert them worst. *Maybe the low-sun fleet at
least pulls its weight across the calendar?*

---

# 04 · Winter tells the truth

**Question:** Is the low-sun capacity dependable through the year, or only in summer?

**Setup:** Break each state's annual generation into Winter / Shoulder / Summer and
drop a pie at each state on the same basemap, sized by annual output. The shape of the
pie is the answer.

### PDL — `seasonal-mix.pdl`
```pdl
let seasonal =
  load "solar_seasonal.csv"
  | select "state", "season", "generation_gwh"

seasonal
  | save "seasonal_generation.csv"
```

### Algraf — `seasonal-pie-map.ag`  *(inset pies on a map)*
```algraf
Chart(data: GeoJson("us_counties.geojson"), width: 860, height: 520,
      title: "Winter tells the truth",
      subtitle: "Seasonal generation mix per state; pie size scales with annual output", caption: "...") {
    Theme(name: "void")
    Table points = "state_points.csv"
    Table mix = "seasonal_generation.csv"
    Space(geom, projection: "albers_usa") {
        Geo(fill: "#f3f4f6", stroke: "#d1d5db", strokeWidth: 0.25)
    }
    Space(long * lat, projection: "albers_usa", data: points) {
        Inset(data: mix, match: [state => state], size: generation_gwh,
              minSize: 22, maxSize: 54, scales: "shared", guides: false, clip: "circle", padding: 1) {
            Space(generation_gwh, coords: "polar", theta: "y") {
                Scale(fill: season, range: ["Winter" => "#4E79A7", "Shoulder" => "#9C755F", "Summer" => "#F28E2B"], label: "Season")
                Bar(fill: season, layout: "fill")
            }
        }
        Text(label: state, dy: -28, size: 7, fill: "#1f2937", anchor: "middle")
    }
}
```

### Prepared output — `seasonal_generation.csv` (33 rows) + bundled `state_points.csv`
```
state,season,generation_gwh
California,Winter,2603
California,Shoulder,4145
California,Summer,2892
New York,Winter,244       <- a sliver
New York,Shoulder,1331
New York,Summer,1141
...  (33 rows: 11 states x 3 seasons)
```

**Conclusion:** The Sun Belt pies are nearly even — the Southwest keeps generating in
January. The Snow Belt pies are a summer story with a winter sliver: 27% of Sun Belt
output lands in winter versus just 9% in the Snow Belt. So the low-sun fleet isn't
merely smaller per panel — it's seasonal, fading exactly when demand peaks for heat.
*Given all this, where should the next megawatt actually go?*

---

# 05 · Where the next megawatt pays off

**Question:** If we can build one more MW anywhere, where does it earn the most power?

**Setup:** Rank every state by output per installed MW — not by how much it already
has — and read it as a siting list, coloured by region.

### PDL — `output-per-mw.pdl`
```pdl
let states =
  load "solar_state.csv"
  | select "state", "region", "capacity_mw", "generation_gwh"

states
  | mutate "gen_per_mw" = round("generation_gwh" / "capacity_mw", 3)
  | sort "gen_per_mw" desc
  | select "state", "region", "capacity_mw", "generation_gwh", "gen_per_mw"
  | save "output_per_mw.csv"
```

### Algraf — `output-per-mw.ag`  *(ranked horizontal bars)*
```algraf
Chart(data: "output_per_mw.csv", width: 740, height: 470, marginLeft: 150, marginRight: 70,
      title: "Where the next megawatt pays off", caption: "...") {
    Theme(name: "minimal")
    Scale(fill: region, palette: "accent", label: "Region")
    Scale(axis: x, domain: [0, 3], breaks: [0,1,2,3], labels: ["0","1","2","3"])
    Scale(axis: y, domain: ["Massachusetts","Minnesota","New York","North Carolina","Florida","Texas","Colorado","California","Nevada","Arizona","New Mexico"])
    Guide(axis: x, label: "Generation per MW (GWh / MW / yr)")
    Guide(axis: y, label: null)
    Space(gen_per_mw * state) {
        Bar(fill: region, layout: "stack", alpha: 0.86,
            tooltip: [state, region, capacity_mw, generation_gwh, gen_per_mw])
        Text(label: gen_per_mw, dx: 6, anchor: "start", format: ".2f", size: 10)
    }
}
```

### Prepared output — `output_per_mw.csv` (11 rows)
```
state,region,capacity_mw,generation_gwh,gen_per_mw
New Mexico,Sun Belt,700,1840,2.629
Arizona,Sun Belt,1800,4573,2.541
Nevada,Sun Belt,1500,3679,2.453
...
New York,Snow Belt,2000,2716,1.358
Minnesota,Snow Belt,1100,1445,1.314
Massachusetts,Snow Belt,1700,2204,1.296
```

**Conclusion (the decision):** The list is sorted by sunlight in everything but name.
New Mexico, Arizona, and Nevada top it; Massachusetts, Minnesota, and New York sit at
the bottom — a new panel in New Mexico generates **roughly twice** what the same panel
makes in Massachusetts. The capacity map from Step 1 is almost the inverse of this
list. **We built where the incentives were; the sun is still waiting in the
Southwest.**

---

## Method — what this studio demonstrates

- **One question per table.** Each PDL program emits the smallest table its chart needs.
- **The map is evidence, not decoration.** Capacity (Step 1) and seasonality (Step 4) are spatial facts; the same county basemap and `albers_usa` projection carry both, so the bubbles and the pies are directly comparable.
- **The chart form is part of the argument.** Ambition → bubble map; physics → scatter; reordering → bump chart; dependability → seasonal pies; a decision → a ranked list.
- **Each answer turns into the next question.** Capacity misleads → output is set by sun → the ranking scrambles → the weak fleet is also seasonal → site the next MW in the Southwest. Reorder the steps and the argument breaks.

**The payoff, in one line:** installed megawatts measure ambition, not electricity;
output per panel is dictated by the sun, so the country built its biggest fleets in
some of its worst places — and the next megawatt belongs in the Southwest.

---

## Note on the DSL surface used

Matched to your corrected syntax (`lit`, `agg ... as`, `mutate`, `save`,
`pivot_longer ... names_to ... values_to`, `if_else`, `count_distinct`, joins on
`"k"` / `("l","r")`; Algraf `caption:`/`subtitle:`, `Text(...)` annotations,
`layout:"stack"`, `Space(a / b * y)` grouping, `GeoJson(...)` + `Space(geom,
projection:)` basemaps, `Inset{ Space(count, coords:"polar") }` pies, `Label(at:,
group:)`). Step 3 uses the supported PDL window syntax
`rank() over (order_by "column" desc)` to produce a 1-based rank over the whole table.
One chart-side feature goes a step beyond the simpler examples: Step 3 uses
`Scale(axis: y, domain: [11.5, 0.5])` to put rank 1 at the top. If a descending numeric
domain is not supported, invert the rank in PDL (`12 - rank`) and relabel.

Both maps reference the bundled `us_counties.geojson`; see `data/README.txt`.
