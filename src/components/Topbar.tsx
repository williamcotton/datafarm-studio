import type React from "react";

import { RouteLink } from "./RouteLink";
import { RuntimePill } from "./RuntimePill";
import type { RuntimeState, StudioPage } from "../studioTypes";

export function Topbar({
  activePage,
  algrafState,
  brandSubtitle,
  onNavigate,
  pdlState,
}: {
  activePage: StudioPage;
  algrafState: RuntimeState;
  brandSubtitle: string;
  onNavigate: (path: string) => void;
  pdlState: RuntimeState;
}): React.ReactElement {
  return (
    <header className="topbar">
      <RouteLink className="brand" onNavigate={onNavigate} to="/">
        <span className="brand-mark">Df</span>
        <span>
          <strong>Datafarm Studio</strong>
          <small>{brandSubtitle}</small>
        </span>
      </RouteLink>
      <div className="topbar-controls">
        <nav className="topnav" aria-label="Primary navigation">
          <TopbarLink active={activePage === "ide"} onNavigate={onNavigate} to="/ide">
            IDE
          </TopbarLink>
          <TopbarLink
            active={activePage === "case-studies" || activePage === "case-study"}
            onNavigate={onNavigate}
            to="/case-studies"
          >
            Case Studies
          </TopbarLink>
          <TopbarLink active={activePage === "docs" || activePage === "docs-how-built"} onNavigate={onNavigate} to="/docs">
            Docs
          </TopbarLink>
          <TopbarLink active={activePage === "labs-interactivity"} onNavigate={onNavigate} to="/labs/interactivity">
            Labs
          </TopbarLink>
        </nav>
        <div className="runtime-pills" aria-label="Runtime status">
          <RuntimePill label="PDL" state={pdlState} />
          <RuntimePill label="Algraf" state={algrafState} />
        </div>
      </div>
    </header>
  );
}

function TopbarLink({
  active,
  children,
  onNavigate,
  to,
}: {
  active: boolean;
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  to: string;
}): React.ReactElement {
  return (
    <RouteLink aria-current={active ? "page" : undefined} onNavigate={onNavigate} to={to}>
      {children}
    </RouteLink>
  );
}
