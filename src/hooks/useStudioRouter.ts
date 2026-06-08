// Wraps src/router.ts helpers with popstate listening and a navigate callback.
//
// Holds: the current StudioRoute. Consumes: routeFromLocation, routeFromPath,
// hrefForRoutePath from ../router. Listens on window popstate; calls
// replaceState to canonicalize the URL when a route resolves to a different
// path. navigate(path) pushes state and scrolls to top.

import React from "react";

import { hrefForRoutePath, routeFromLocation, routeFromPath, type StudioRoute } from "../router";

export interface StudioRouterApi {
  route: StudioRoute;
  navigate: (path: string) => void;
}

export function useStudioRouter(): StudioRouterApi {
  const [route, setRoute] = React.useState<StudioRoute>(() => routeFromLocation());

  React.useEffect(() => {
    const handlePopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    const canonicalPath = hrefForRoutePath(route.path);
    if (window.location.pathname !== new URL(canonicalPath, window.location.origin).pathname) {
      window.history.replaceState(null, "", canonicalPath);
    }
  }, [route.path]);

  const navigate = React.useCallback((path: string) => {
    const nextRoute = routeFromPath(path);
    const href = hrefForRoutePath(nextRoute.path);
    window.history.pushState(null, "", href);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  return { route, navigate };
}
