import type React from "react";

import { hrefForRoutePath } from "../router";

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">;

export function RouteLink({
  children,
  onNavigate,
  to,
  ...anchorProps
}: AnchorProps & {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  to: string;
}): React.ReactElement {
  return (
    <a
      {...anchorProps}
      href={hrefForRoutePath(to)}
      onClick={(event) => {
        if (shouldUseNativeNavigation(event, anchorProps.target)) {
          return;
        }
        event.preventDefault();
        onNavigate(to);
      }}
    >
      {children}
    </a>
  );
}

function shouldUseNativeNavigation(event: React.MouseEvent<HTMLAnchorElement>, target?: string): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    (target != null && target !== "_self")
  );
}
