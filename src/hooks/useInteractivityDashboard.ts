// Owns the labs interactivity dashboard context plus the last Algraf emit.
//
// Holds: dashboardContext, lastEmit. Provides onEmit (selector emits update
// lastEmit and re-derive the active zone) and onContextChange (manual
// dashboard edits). No runtime adapters consumed; no cleanup required.

import React from "react";

import { DEFAULT_DASHBOARD_CONTEXT } from "../interactivityDemoData";
import type { AlgrafEmitPayload, DashboardContext } from "../studioTypes";

export interface InteractivityDashboardApi {
  dashboardContext: DashboardContext;
  lastEmit: AlgrafEmitPayload | null;
  onContextChange: React.Dispatch<React.SetStateAction<DashboardContext>>;
  onEmit: (payload: AlgrafEmitPayload) => void;
}

export function useInteractivityDashboard(): InteractivityDashboardApi {
  const [dashboardContext, setDashboardContext] = React.useState<DashboardContext>(DEFAULT_DASHBOARD_CONTEXT);
  const [lastEmit, setLastEmit] = React.useState<AlgrafEmitPayload | null>(null);

  const onEmit = React.useCallback((payload: AlgrafEmitPayload) => {
    setLastEmit(payload);
    if (payload.type === "click" && payload.field === "zone") {
      setDashboardContext((current) => ({ ...current, selected_zone: payload.value }));
    }
  }, []);

  return {
    dashboardContext,
    lastEmit,
    onContextChange: setDashboardContext,
    onEmit,
  };
}
