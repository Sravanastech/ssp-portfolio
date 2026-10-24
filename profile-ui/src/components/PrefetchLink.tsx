import { forwardRef } from "react";
import {
  Link,
  NavLink,
  useNavigate,
  type LinkProps,
  type NavLinkProps,
} from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";
import { runRouteTransition } from "@/lib/viewTransition";

function pathOf(to: LinkProps["to"]): string {
  if (typeof to === "string") return to;
  return `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
}

/** Shared handlers: prefetch on intent, animate plain left-clicks as a route transition. */
function useIntent(
  to: LinkProps["to"],
  props: Pick<
    LinkProps,
    | "onPointerEnter"
    | "onFocus"
    | "onTouchStart"
    | "onClick"
    | "target"
    | "replace"
    | "state"
    | "reloadDocument"
  >,
) {
  const navigate = useNavigate();
  const warm = () => void prefetchRoute(pathOf(to));
  return {
    onPointerEnter: (e: React.PointerEvent<HTMLAnchorElement>) => {
      props.onPointerEnter?.(e);
      warm();
    },
    onFocus: (e: React.FocusEvent<HTMLAnchorElement>) => {
      props.onFocus?.(e);
      warm();
    },
    onTouchStart: (e: React.TouchEvent<HTMLAnchorElement>) => {
      props.onTouchStart?.(e);
      warm();
    },
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      props.onClick?.(e);
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        (props.target && props.target !== "_self") ||
        props.reloadDocument ||
        (typeof to === "string" && /^[a-z][a-z0-9+.-]*:/i.test(to))
      )
        return;
      e.preventDefault();
      // Load the chunk first (bounded) so the transition lands on content, not a skeleton.
      const ready = Promise.race([
        prefetchRoute(pathOf(to)),
        new Promise<void>((r) => setTimeout(r, 250)),
      ]);
      void ready.then(() =>
        runRouteTransition(
          () =>
            void navigate(to, { replace: props.replace, state: props.state }),
        ),
      );
    },
  };
}

const PrefetchLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function PrefetchLink({ to, ...rest }, ref) {
    const intent = useIntent(to, rest);
    return <Link ref={ref} to={to} {...rest} {...intent} />;
  },
);

export const PrefetchNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function PrefetchNavLink({ to, ...rest }, ref) {
    const intent = useIntent(to, rest);
    return <NavLink ref={ref} to={to} {...rest} {...intent} />;
  },
);

export default PrefetchLink;
