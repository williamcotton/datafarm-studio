import type React from "react";

import { RuntimePill } from "./RuntimePill";
import { StorySwitcher } from "./StorySwitcher";
import type { StoryId } from "../storyBundles";
import type { RuntimeState, StudioPage } from "../studioTypes";

export function Topbar({
  activePage,
  activeStoryId,
  algrafState,
  brandSubtitle,
  homeHref,
  onDemoSelect,
  onStoryChange,
  pdlState,
}: {
  activePage: StudioPage;
  activeStoryId: StoryId;
  algrafState: RuntimeState;
  brandSubtitle: string;
  homeHref: string;
  onDemoSelect: () => void;
  onStoryChange: (storyId: StoryId) => void;
  pdlState: RuntimeState;
}): React.ReactElement {
  return (
    <header className="topbar">
      <a className="brand" href={homeHref}>
        <span className="brand-mark">Df</span>
        <span>
          <strong>Datafarm Studio</strong>
          <small>{brandSubtitle}</small>
        </span>
      </a>
      <div className="topbar-controls">
        <StorySwitcher
          activePage={activePage}
          activeStoryId={activeStoryId}
          onDemoSelect={onDemoSelect}
          onStoryChange={onStoryChange}
        />
        <div className="runtime-pills" aria-label="Runtime status">
          <RuntimePill label="PDL" state={pdlState} />
          <RuntimePill label="Algraf" state={algrafState} />
        </div>
      </div>
    </header>
  );
}
