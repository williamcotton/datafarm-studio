Basemap
-------
The two map charts (01 bubble map, 04 seasonal pie map) reference

    us_counties.geojson

This is the same US county basemap used by the us_city_bubbles / inset_city_pies
examples. The Studio runtime serves it as a root-level virtual file, so the
Algraf examples use the bare filename. You can point the GeoJson(...) call at
another basemap if you prefer; a us_states.geojson works just as well with the
albers_usa projection, since the overlays are positioned by long/lat.

Source tables
-------------
solar_state.csv     one row per state: centroid long/lat, region, peak sun hours,
                    installed capacity (MW), annual generation (GWh).
solar_seasonal.csv  one row per state x season (Winter / Shoulder / Summer): GWh.

All figures are synthetic, sized to make the story legible; capacity factors track
real Sun-Belt vs Snow-Belt irradiance.
