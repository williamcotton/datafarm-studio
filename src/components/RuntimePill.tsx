import type React from "react";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

import type { RuntimeState } from "../studioTypes";

export function RuntimePill({ label, state }: { label: string; state: RuntimeState }): React.ReactElement {
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
