import type React from "react";

import { STORY_BUNDLES, type StoryId } from "../storyBundles";
import type { StudioPage } from "../studioTypes";

export function StorySwitcher({
  activePage,
  activeStoryId,
  onDemoSelect,
  onStoryChange,
}: {
  activePage: StudioPage;
  activeStoryId: StoryId;
  onDemoSelect: () => void;
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
    </div>
  );
}
