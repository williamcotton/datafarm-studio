import type React from "react";

import { STORY_BUNDLES, type StoryId } from "../storyBundles";
import type { StudioPage } from "../studioTypes";

export function StorySwitcher({
  activePage,
  activeStoryId,
  onBuildSelect,
  onDemoSelect,
  onSqlSelect,
  onStoryChange,
}: {
  activePage: StudioPage;
  activeStoryId: StoryId;
  onBuildSelect: () => void;
  onDemoSelect: () => void;
  onSqlSelect: () => void;
  onStoryChange: (storyId: StoryId) => void;
}): React.ReactElement {
  return (
    <div className="segmented-control story-switcher" aria-label="Story">
      {STORY_BUNDLES.map((story) => (
        <button
          aria-pressed={activePage === "story" && story.id === activeStoryId}
          key={story.id}
          onClick={() => onStoryChange(story.id)}
          type="button"
        >
          {story.navLabel}
        </button>
      ))}
      <button aria-pressed={activePage === "interactivity"} onClick={onDemoSelect} type="button">
        Interactivity
      </button>
      <button aria-pressed={activePage === "sql"} onClick={onSqlSelect} type="button">
        SQL
      </button>
      <button aria-pressed={activePage === "how-built"} onClick={onBuildSelect} type="button">
        How Built
      </button>
    </div>
  );
}
