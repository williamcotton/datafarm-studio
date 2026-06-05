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
    body:
      "Datafarm Studio is the browser IDE for the Datafarm workflow: raw files become prepared PDL outputs, and Algraf turns those outputs into auditable charts.",
    bullets: ["The browser owns files and UI state.", "PDL owns table preparation.", "Algraf owns chart rendering."],
  },
  {
    id: "pdl",
    icon: <Workflow size={18} aria-hidden="true" />,
    title: "PDL basics",
    body:
      "PDL programs load host-supplied files, transform tables through pipelines, emit named outputs, and save prepared files for later surfaces.",
    bullets: ["Use `load` for in-memory files.", "Use pipelines for deterministic table steps.", "Use `output` and `save` for reusable artifacts."],
  },
  {
    id: "algraf",
    icon: <Boxes size={18} aria-hidden="true" />,
    title: "Algraf basics",
    body:
      "Algraf receives prepared files from Studio and returns inert SVG plus diagnostics and optional sidecar metadata for audited interactivity.",
    bullets: ["Charts read files by path-like names.", "Scales and marks encode the argument.", "Returned SVG is embedded by Studio."],
  },
  {
    id: "runtime",
    icon: <BookOpenText size={18} aria-hidden="true" />,
    title: "Browser runtime model",
    body:
      "Studio loads PDL, Algraf, and SQL.js WASM assets from the public base path, then calls their browser APIs with in-memory file maps.",
    bullets: ["No runtime reads local host files directly.", "Runtime errors become diagnostics.", "GitHub Pages serves the same static assets."],
  },
  {
    id: "interactivity",
    icon: <MousePointerClick size={18} aria-hidden="true" />,
    title: "Interactivity model",
    body:
      "React owns controls and selected state. PDL receives those values as context, Algraf emits chart events, and React routes audited events back into state.",
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
          Start with the system model, then move into PDL, Algraf, browser runtimes, interactivity, SQL, and the live
          How Built walkthrough.
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
