import type React from "react";
import { BookOpenText, Boxes, Database, MousePointerClick, Route, Workflow } from "lucide-react";

import { RouteLink } from "./RouteLink";

interface DocsSection {
  id: string;
  icon: React.ReactElement;
  title: string;
  body: string;
  bullets: string[];
}

const DOCS_SECTIONS: DocsSection[] = [
  {
    id: "overview",
    icon: <Route size={18} aria-hidden="true" />,
    title: "Datafarm overview",
    body: "Datafarm Studio keeps the path from raw files to prepared tables to charts in one browser workspace.",
    bullets: ["The browser manages files and UI state.", "PDL prepares tables.", "Algraf renders charts."],
  },
  {
    id: "pdl",
    icon: <Workflow size={18} aria-hidden="true" />,
    title: "PDL basics",
    body:
      "PDL programs load files, transform tables through pipelines, emit named outputs, and save prepared files for charts and stories.",
    bullets: ["Use `load` for in-memory files.", "Use pipelines for deterministic table steps.", "Use `output` and `save` for reusable artifacts."],
  },
  {
    id: "algraf",
    icon: <Boxes size={18} aria-hidden="true" />,
    title: "Algraf basics",
    body: "Algraf reads prepared files and returns SVG charts with diagnostics and optional event metadata.",
    bullets: ["Charts read files by path-like names.", "Scales and marks encode the visual argument.", "Studio embeds the returned SVG."],
  },
  {
    id: "runtime",
    icon: <BookOpenText size={18} aria-hidden="true" />,
    title: "Browser runtime model",
    body:
      "Studio loads PDL, Algraf, and SQL.js as browser WASM assets, then passes source and in-memory files to each runtime.",
    bullets: ["No runtime reads local host files directly.", "Runtime errors become diagnostics.", "GitHub Pages serves the same static assets."],
  },
  {
    id: "interactivity",
    icon: <MousePointerClick size={18} aria-hidden="true" />,
    title: "Interactivity model",
    body:
      "React stores selected values. PDL receives them as context, Algraf reports chart events, and React writes the selection back into state.",
    bullets: ["Context values stay JSON primitives.", "Algraf events come from inert metadata.", "The current demo reruns the workflow on change."],
  },
  {
    id: "sql",
    icon: <Database size={18} aria-hidden="true" />,
    title: "SQL workspace notes",
    body:
      "The SQL workspace is browser-local. It can create memory databases, import CSV, open SQLite files, inspect schemas, run SQL, and export results.",
    bullets: ["SQL.js loads from `wasm/sql-wasm.wasm`.", "Uploaded files stay in browser memory.", "SQL does not change PDL or Algraf semantics."],
  },
];

export function DocsPage({ onNavigate }: { onNavigate: (path: string) => void }): React.ReactElement {
  return (
    <div className="docs-page">
      <DocsHero onNavigate={onNavigate} />
      <section className="docs-grid" aria-label="Documentation sections">
        {DOCS_SECTIONS.map((section) => (
          <article className="docs-card" id={section.id} key={section.id}>
            <div className="docs-card-icon">{section.icon}</div>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}

export function DocsHeader({ onNavigate }: { onNavigate: (path: string) => void }): React.ReactElement {
  return (
    <section className="docs-subnav" aria-label="Docs navigation">
      <div>
        <p className="eyebrow">Docs</p>
        <h1>How Built</h1>
      </div>
      <div className="hero-actions">
        <RouteLink className="secondary-button" onNavigate={onNavigate} to="/docs">
          Docs index
        </RouteLink>
        <RouteLink className="secondary-button" onNavigate={onNavigate} to="/labs/interactivity">
          Interactivity lab
        </RouteLink>
      </div>
    </section>
  );
}

function DocsHero({ onNavigate }: { onNavigate: (path: string) => void }): React.ReactElement {
  return (
    <section className="docs-hero">
      <div className="hero-copy">
        <p className="eyebrow">Docs</p>
        <h1>Build with Datafarm Studio.</h1>
        <p>
          Start with the workflow model, then dig into PDL, Algraf, browser runtimes, interactivity, SQL, and the live
          How Built example.
        </p>
        <div className="hero-actions">
          <RouteLink className="primary-button" onNavigate={onNavigate} to="/docs/how-built">
            <BookOpenText size={16} aria-hidden="true" />
            Open How Built
          </RouteLink>
          <RouteLink className="secondary-button" onNavigate={onNavigate} to="/ide">
            <Workflow size={16} aria-hidden="true" />
            Open IDE
          </RouteLink>
        </div>
      </div>
    </section>
  );
}
