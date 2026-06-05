import type React from "react";
import { ArrowRight, BarChart3, FolderKanban } from "lucide-react";

import { RouteLink } from "./RouteLink";
import { STORY_BUNDLES, type StoryId } from "../storyBundles";
import { storyRoutePath } from "../router";

export function CaseStudiesIndexPage({ onNavigate }: { onNavigate: (path: string) => void }): React.ReactElement {
  return (
    <div className="case-studies-page">
      <section className="case-studies-hero">
        <div className="hero-copy">
          <p className="eyebrow">Case studies</p>
          <h1>Open the work behind the story.</h1>
          <p>
            Each case study keeps the raw files, preparation code, generated CSVs, chart source, rendered visuals,
            evidence, and conclusions together so every claim can be inspected and rerun.
          </p>
        </div>
      </section>

      <section className="case-study-card-grid" aria-label="Available case studies">
        {STORY_BUNDLES.map((story) => (
          <RouteLink className="case-study-card" key={story.id} onNavigate={onNavigate} to={storyRoutePath(story.id)}>
            <span className="case-study-card-icon">
              <FolderKanban size={18} aria-hidden="true" />
            </span>
            <p className="eyebrow">{story.hero.eyebrow}</p>
            <h2>{story.navLabel}</h2>
            <p>{story.hero.subhead}</p>
            <div className="case-study-card-metrics">
              {story.hero.metrics.slice(0, 3).map((metric) => (
                <span key={metric.label}>
                  <strong>{metric.value}</strong>
                  {metric.label}
                </span>
              ))}
            </div>
            <span className="case-study-card-link">
              Open workflow
              <ArrowRight size={15} aria-hidden="true" />
            </span>
          </RouteLink>
        ))}
      </section>
    </div>
  );
}

export function CaseStudyNav({
  activeStoryId,
  onNavigate,
}: {
  activeStoryId: StoryId;
  onNavigate: (path: string) => void;
}): React.ReactElement {
  return (
    <section className="case-study-nav" aria-label="Case study navigation">
      <div className="case-study-nav-title">
        <BarChart3 size={16} aria-hidden="true" />
        <span>Case Studies</span>
      </div>
      <div className="segmented-control">
        {STORY_BUNDLES.map((story) => (
          <RouteLink
            aria-current={story.id === activeStoryId ? "page" : undefined}
            className="segment-link"
            key={story.id}
            onNavigate={onNavigate}
            to={storyRoutePath(story.id)}
          >
            {story.navLabel}
          </RouteLink>
        ))}
      </div>
      <RouteLink className="secondary-button case-study-nav-index" onNavigate={onNavigate} to="/case-studies">
        All case studies
      </RouteLink>
    </section>
  );
}
