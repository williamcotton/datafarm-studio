import type React from "react";

import { DataEditor } from "../DataEditor";

export function DataPanel({
  className,
  icon,
  label,
  language,
  meta,
  value,
  onChange,
  modelUri,
}: {
  className: string;
  icon: React.ReactElement;
  label: string;
  language: "csv" | "json";
  meta: string;
  value: string;
  onChange: (value: string) => void;
  modelUri: string;
}): React.ReactElement {
  return (
    <article className={`editor-panel ${className}`}>
      <div className="panel-header">
        <span>
          {icon}
          {label}
        </span>
        <small>{meta}</small>
      </div>
      <div className="editor-host">
        <DataEditor language={language} modelUri={modelUri} onChange={onChange} value={value} />
      </div>
    </article>
  );
}
