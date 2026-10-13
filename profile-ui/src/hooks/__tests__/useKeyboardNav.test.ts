import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNav } from "../useKeyboardNav";

describe("useKeyboardNav", () => {
  it("should call onEnter when Enter key is pressed", () => {
    const onEnter = vi.fn();
    const ref = { current: document.createElement("div") };

    const { result } = renderHook(() => useKeyboardNav(ref, { onEnter }));

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    const reactEvent = {
      ...event,
      key: "Enter",
      preventDefault: () => event.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      result.current.onKeyDown(reactEvent);
    });

    expect(onEnter).toHaveBeenCalled();
  });

  it("should call onSpace when Space key is pressed", () => {
    const onSpace = vi.fn();
    const ref = { current: document.createElement("div") };

    const { result } = renderHook(() => useKeyboardNav(ref, { onSpace }));

    const event = new KeyboardEvent("keydown", { key: " " });
    const reactEvent = {
      ...event,
      key: " ",
      preventDefault: () => event.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      result.current.onKeyDown(reactEvent);
    });

    expect(onSpace).toHaveBeenCalled();
  });

  it("should call onClick on Enter or Space if onEnter/onSpace not provided", () => {
    const onClick = vi.fn();
    const ref = { current: document.createElement("div") };

    const { result: resultEnter } = renderHook(() =>
      useKeyboardNav(ref, { onClick }),
    );

    const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
    const enterReactEvent = {
      ...enterEvent,
      key: "Enter",
      preventDefault: () => enterEvent.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      resultEnter.current.onKeyDown(enterReactEvent);
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    const spaceEvent = new KeyboardEvent("keydown", { key: " " });
    const spaceReactEvent = {
      ...spaceEvent,
      key: " ",
      preventDefault: () => spaceEvent.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      resultEnter.current.onKeyDown(spaceReactEvent);
    });

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("should ignore other keys", () => {
    const onEnter = vi.fn();
    const onSpace = vi.fn();
    const onClick = vi.fn();
    const ref = { current: document.createElement("div") };

    const { result } = renderHook(() =>
      useKeyboardNav(ref, { onEnter, onSpace, onClick }),
    );

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    const reactEvent = {
      ...event,
      key: "ArrowUp",
      preventDefault: () => event.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      result.current.onKeyDown(reactEvent);
    });

    expect(onEnter).not.toHaveBeenCalled();
    expect(onSpace).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should prevent default on Enter and Space", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useKeyboardNav(ref, {}));

    const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
    const preventDefaultSpy = vi.spyOn(enterEvent, "preventDefault");

    const enterReactEvent = {
      ...enterEvent,
      key: "Enter",
      preventDefault: () => enterEvent.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      result.current.onKeyDown(enterReactEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();

    const spaceEvent = new KeyboardEvent("keydown", { key: " " });
    const preventDefaultSpaceSpy = vi.spyOn(spaceEvent, "preventDefault");

    const spaceReactEvent = {
      ...spaceEvent,
      key: " ",
      preventDefault: () => spaceEvent.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>;
    act(() => {
      result.current.onKeyDown(spaceReactEvent);
    });

    expect(preventDefaultSpaceSpy).toHaveBeenCalled();
  });
});
