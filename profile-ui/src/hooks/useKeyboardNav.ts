import React from "react";

export interface KeyboardNavHandlers {
  onEnter?: () => void;
  onSpace?: () => void;
  onClick?: () => void;
}

export function useKeyboardNav<T extends HTMLElement>(
  _ref: React.RefObject<T | null>,
  handlers: KeyboardNavHandlers,
) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();

      if (e.key === "Enter" && handlers.onEnter) {
        handlers.onEnter();
      } else if (e.key === " " && handlers.onSpace) {
        handlers.onSpace();
      } else if (handlers.onClick) {
        handlers.onClick();
      }
    }
  };

  const handleClick = () => {
    if (handlers.onClick) {
      handlers.onClick();
    }
  };

  return {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  };
}
