import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import TurnstileWidget from "../TurnstileWidget";
import { __resetTurnstileForTests } from "@/lib/turnstileLoader";

type Opts = {
  sitekey: string;
  action: string;
  callback: (t: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};
const api = {
  render: vi.fn<(el: HTMLElement, o: Opts) => string>(() => "w1"),
  reset: vi.fn(),
  remove: vi.fn(),
};
const scripts = () =>
  Array.from(document.querySelectorAll<HTMLScriptElement>("script")).filter(
    (s) => s.src.includes("challenges.cloudflare.com"),
  );
const loadScript = async () => {
  await act(async () => {
    (window as unknown as { turnstile: typeof api }).turnstile = api;
    scripts()[0].onload?.(new Event("load"));
  });
};

describe("TurnstileWidget", () => {
  beforeEach(() => {
    __resetTurnstileForTests();
    scripts().forEach((s) => s.remove());
    delete (window as unknown as { turnstile?: unknown }).turnstile;
    Object.values(api).forEach((f) => f.mockClear());
  });
  afterEach(() => vi.restoreAllMocks());

  it("lazy-loads the Cloudflare script once and renders explicitly", async () => {
    const props = { siteKey: "site", onToken: vi.fn(), onExpire: vi.fn() };
    render(<TurnstileWidget {...props} />);
    render(<TurnstileWidget {...props} />);
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
    expect(screen.getAllByText(/Loading verification/i).length).toBeGreaterThan(
      0,
    );
    await loadScript();
    expect(api.render).toHaveBeenCalledTimes(2);
    expect(api.render.mock.calls[0][1]).toMatchObject({
      sitekey: "site",
      action: "resume_otp",
    });
  });

  it("forwards token, expiry and error events", async () => {
    const onToken = vi.fn();
    const onExpire = vi.fn();
    render(
      <TurnstileWidget siteKey="s" onToken={onToken} onExpire={onExpire} />,
    );
    await loadScript();
    const opts = api.render.mock.calls[0][1];
    act(() => opts.callback("tok-1"));
    expect(onToken).toHaveBeenCalledWith("tok-1");
    act(() => opts["expired-callback"]());
    expect(onExpire).toHaveBeenCalled();
    act(() => opts["error-callback"]());
    expect(screen.getByText(/could not load/i)).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledTimes(2);
  });

  it("resets the widget when resetKey changes", async () => {
    const props = { siteKey: "s", onToken: vi.fn(), onExpire: vi.fn() };
    const { rerender } = render(<TurnstileWidget {...props} resetKey={0} />);
    await loadScript();
    expect(api.reset).not.toHaveBeenCalled();
    rerender(<TurnstileWidget {...props} resetKey={1} />);
    expect(api.reset).toHaveBeenCalledWith("w1");
  });

  it("removes the widget on unmount", async () => {
    const view = render(
      <TurnstileWidget siteKey="s" onToken={vi.fn()} onExpire={vi.fn()} />,
    );
    await loadScript();
    view.unmount();
    expect(api.remove).toHaveBeenCalledWith("w1");
  });

  it("does not render after unmounting before the script loads", async () => {
    const view = render(
      <TurnstileWidget siteKey="s" onToken={vi.fn()} onExpire={vi.fn()} />,
    );
    view.unmount();
    await loadScript();
    expect(api.render).not.toHaveBeenCalled();
  });

  it("shows accessible fallback text when the script fails to load", async () => {
    render(
      <TurnstileWidget siteKey="s" onToken={vi.fn()} onExpire={vi.fn()} />,
    );
    await act(async () => {
      scripts()[0].onerror?.(new Event("error"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/could not load/i);
  });

  it("shows fallback and loads nothing without a site key", () => {
    render(<TurnstileWidget siteKey="" onToken={vi.fn()} onExpire={vi.fn()} />);
    expect(scripts()).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(/unavailable/i);
  });

  it("renders with a caller-supplied action and defaults to resume_otp", async () => {
    render(
      <TurnstileWidget
        siteKey="s"
        action="contact"
        onToken={vi.fn()}
        onExpire={vi.fn()}
      />,
    );
    render(
      <TurnstileWidget siteKey="s" onToken={vi.fn()} onExpire={vi.fn()} />,
    );
    await loadScript();
    expect(api.render.mock.calls[0][1].action).toBe("contact");
    expect(api.render.mock.calls[1][1].action).toBe("resume_otp");
  });

  it("uses caller-supplied fallback copy", () => {
    render(
      <TurnstileWidget
        siteKey=""
        hints={{ unconfigured: "Use the email link." }}
        onToken={vi.fn()}
        onExpire={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Use the email link.");
  });
});
