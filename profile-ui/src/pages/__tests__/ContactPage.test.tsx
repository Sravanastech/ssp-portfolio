import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/theme/ThemeContext";
import ContactPage from "../ContactPage";

vi.mock("@/lib/monitoring", () => ({ reportEvent: vi.fn() }));
vi.mock("@/components/TurnstileWidget", () => ({
  default: ({
    action,
    onToken,
    onExpire,
    resetKey,
  }: {
    action?: string;
    onToken: (t: string) => void;
    onExpire: () => void;
    resetKey?: number;
  }) => (
    <div data-testid="turnstile" data-action={action} data-reset={resetKey}>
      <button type="button" onClick={() => onToken(`token-${resetKey}`)}>
        solve check
      </button>
      <button type="button" onClick={onExpire}>
        expire check
      </button>
    </div>
  ),
}));

function renderContact() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HelmetProvider>
        <ThemeProvider>
          <ContactPage />
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

function fillContact() {
  fireEvent.change(screen.getByPlaceholderText("Your name"), {
    target: { value: "Test Person" },
  });
  fireEvent.change(screen.getByPlaceholderText("example@mail.com"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(
    screen.getByPlaceholderText(
      "Tell me about the role, the team, or your questions…",
    ),
    { target: { value: "Please discuss this project with me." } },
  );
}

function openContact() {
  renderContact();
  fillContact();
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

describe("contact delivery experience (web3forms fallback)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_CONTACT_MODE", "web3forms");
    vi.stubEnv("VITE_WEB3FORMS_ACCESS_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("preserves the draft and offers email when delivery fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    openContact();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Delivery could not be confirmed",
    );
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Test Person");
    expect(
      screen.getByPlaceholderText(
        "Tell me about the role, the team, or your questions…",
      ),
    ).toHaveValue("Please discuss this project with me.");
    expect(
      screen.getByRole("link", { name: "contact@sravanasparimi.com" }),
    ).toHaveAttribute("href", "mailto:contact@sravanasparimi.com");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("acknowledges provider acceptance and clears the form only on explicit reset", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true, message: "Accepted" })),
        ),
    );
    openContact();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Message submitted",
    );
    expect(screen.queryByText(/Redirecting/)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Send another message" }),
    );
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Your name")).toHaveValue(""),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("contact delivery experience (backend api)", () => {
  const sendButton = () => screen.getByRole("button", { name: /Send message/ });
  const accepted = () =>
    new Response(JSON.stringify({ receipt: "r", status: "accepted" }), {
      status: 202,
    });
  const failing = (status: number, code: string) =>
    vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ code }), { status }),
      );

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders the contact-action Turnstile and blocks sending until solved", async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted());
    vi.stubGlobal("fetch", fetchMock);
    renderContact();
    expect(screen.getByTestId("turnstile")).toHaveAttribute(
      "data-action",
      "contact",
    );
    fillContact();
    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(sendButton());
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "solve check" }));
    expect(sendButton()).not.toHaveAttribute("aria-disabled");
  });

  it("posts the token to /api/contact and shows the success state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted());
    vi.stubGlobal("fetch", fetchMock);
    renderContact();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "solve check" }));
    fireEvent.click(sendButton());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Message submitted",
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/contact");
    expect(JSON.parse(init.body).turnstileToken).toBe("token-0");
    expect(init.headers["Idempotency-Key"]).toBeTruthy();
  });

  it("asks for a fresh token after a failed attempt and keeps the draft", async () => {
    vi.stubGlobal("fetch", failing(403, "captcha_failed"));
    renderContact();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "solve check" }));
    fireEvent.click(sendButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "verification check was not accepted",
    );
    expect(screen.getByPlaceholderText("Your name")).toHaveValue("Test Person");
    await waitFor(() =>
      expect(screen.getByTestId("turnstile")).toHaveAttribute(
        "data-reset",
        "1",
      ),
    );
    expect(sendButton()).toHaveAttribute("aria-disabled", "true");
  });

  it("explains rate limiting without offering a pointless offline save", async () => {
    vi.stubGlobal("fetch", failing(429, "rate_limited"));
    renderContact();
    fillContact();
    fireEvent.click(screen.getByRole("button", { name: "solve check" }));
    fireEvent.click(sendButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many messages",
    );
    expect(
      screen.queryByRole("button", { name: "Save to send when online" }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry when the verification check expires", () => {
    renderContact();
    fireEvent.click(screen.getByRole("button", { name: "solve check" }));
    fireEvent.click(screen.getByRole("button", { name: "expire check" }));
    expect(screen.getByText(/check expired or failed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry check" }));
    expect(screen.getByTestId("turnstile")).toHaveAttribute("data-reset", "1");
  });

  it("does not render Turnstile in web3forms mode", () => {
    vi.stubEnv("VITE_CONTACT_MODE", "web3forms");
    renderContact();
    expect(screen.queryByTestId("turnstile")).not.toBeInTheDocument();
  });
});
