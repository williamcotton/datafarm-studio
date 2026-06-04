Basemap
-------
The two map charts (01 bubble map, 04 seasonal pie map) reference

    ../data/us_counties.geojson

This is the same US county basemap used by the us_city_bubbles / inset_city_pies
examples - it is NOT bundled here (it's large and you already have it). Drop your
existing us_counties.geojson into this data/ folder, or point the GeoJson(...) call
at whatever basemap you prefer (a us_states.geojson works just as well with the
albers_usa projection, since the overlays are positioned by long/lat).

Source tables
-------------
solar_state.csv     one row per state: centroid long/lat, region, peak sun hours,
                    installed capacity (MW), annual generation (GWh).
solar_seasonal.csv  one row per state x season (Winter / Shoulder / Summer): GWh.

All figures are synthetic, sized to make the story legible; capacity factors track
real Sun-Belt vs Snow-Belt irradiance.
