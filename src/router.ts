import { DEFAULT_STORY_ID, STORY_BUNDLES, type StoryId } from "./storyBundles";
import type { StudioPage } from "./studioTypes";

export interface StudioRoute {
  page: StudioPage;
  path: string;
  storyId?: StoryId;
}

const STORY_IDS = new Set<StoryId>(STORY_BUNDLES.map((story) => story.id));

export function routeFromLocation(location: Pick<Location, "pathname"> = window.location): StudioRoute {
  return routeFromPath(pathWithoutBase(location.pathname));
}

export function routeFromPath(rawPath: string): StudioRoute {
  const path = normalizeRoutePath(rawPath);
  const parts = path.split("/").filter(Boolean);

  if (path === "/") {
    return { page: "landing", path: "/" };
  }

  if (path === "/ide" || path === "/sql") {
    return { page: "ide", path: "/ide" };
  }

  if (path === "/case-studies") {
    return { page: "case-studies", path: "/case-studies" };
  }

  if (parts[0] === "case-studies") {
    const storyId = storyIdFromRoutePart(parts[1]);
    return {
      page: "case-study",
      path: storyRoutePath(storyId),
      storyId,
    };
  }

  if (path === "/docs") {
    return { page: "docs", path: "/docs" };
  }

  if (path === "/docs/how-built" || path === "/how-built") {
    return { page: "docs-how-built", path: "/docs/how-built" };
  }

  if (path === "/labs/interactivity" || path === "/interactivity") {
    return { page: "labs-interactivity", path: "/labs/interactivity" };
  }

  return { page: "landing", path: "/" };
}

export function hrefForRoutePath(path: string): string {
  const base = normalizedBasePath();
  const normalizedPath = normalizeRoutePath(path);
  if (normalizedPath === "/") {
    return base;
  }
  return `${base}${normalizedPath.slice(1)}`;
}

export function storyRoutePath(storyId: StoryId): string {
  return `/case-studies/${storyId}`;
}

function pathWithoutBase(pathname: string): string {
  const base = normalizedBasePath();
  if (base !== "/" && pathname.startsWith(base)) {
    return `/${pathname.slice(base.length)}`;
  }
  return pathname;
}

function normalizedBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") {
    return "/";
  }
  return `/${base.replace(/^\/+|\/+$/g, "")}/`;
}

function normalizeRoutePath(rawPath: string): string {
  const withoutQuery = rawPath.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const trimmed = withLeadingSlash.replace(/\/+$/g, "");
  return trimmed || "/";
}

function storyIdFromRoutePart(value: string | undefined): StoryId {
  if (value && STORY_IDS.has(value as StoryId)) {
    return value as StoryId;
  }
  return DEFAULT_STORY_ID;
}
