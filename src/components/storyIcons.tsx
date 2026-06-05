import type React from "react";
import { BarChart3, Bike, CloudRain, GitMerge, MapPinned, Rows3, Search, Workflow } from "lucide-react";

import type { MethodIcon, RawDataIcon } from "../storyBundles";

export function methodIcon(icon: MethodIcon): React.ReactElement {
  switch (icon) {
    case "search":
      return <Search size={18} aria-hidden="true" />;
    case "join":
      return <GitMerge size={18} aria-hidden="true" />;
    case "workflow":
      return <Workflow size={18} aria-hidden="true" />;
    case "chart":
      return <BarChart3 size={18} aria-hidden="true" />;
  }
}

export function rawDataIcon(icon: RawDataIcon): React.ReactElement {
  switch (icon) {
    case "bike":
      return <Bike size={16} aria-hidden="true" />;
    case "map":
    case "geojson":
      return <MapPinned size={16} aria-hidden="true" />;
    case "weather":
      return <CloudRain size={16} aria-hidden="true" />;
    case "sun":
      return <BarChart3 size={16} aria-hidden="true" />;
    case "seasonal":
      return <Rows3 size={16} aria-hidden="true" />;
  }
}
