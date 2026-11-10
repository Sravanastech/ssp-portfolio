import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import ResumePage from "../ResumePage";
import { __resetWarmupForTests } from "@/lib/backendWarmup";
import { clear, getToken, setToken } from "@/lib/otpSession";

const renderer = vi.hoisted(() => ({
  renderPdf: vi.fn((opts: { host: HTMLElement; onFirstPage: () => void }) => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    opts.host.append(canvas);
    opts.onFirstPage();
    return { destroy: vi.fn() };
  }),
}));
vi.mock("@/lib/pdfRender", () => renderer);

const auth = vi.hoisted(() => ({
  getAccessTokenSilently: vi.fn(),
  loginWithRedirect: vi.fn(),
  isAuthenticated: true,
  isLoading: false,
}));
vi.mock("@/components/TurnstileWidget", () => ({ default: () => null }));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));

const resumeCalls = () =>
  vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/resume");

function preview() {
  return render(
    <HelmetProvider>
      <ResumePage />
    </HelmetProvider>,
  );
}

describe("secure resume preview", () => {
  beforeEach(() => {
    clear();
    sessionStorage.clear();
    auth.isLoading = false;
    auth.isAuthenticated = true;
    auth.getAccessTokenSilently.mockResolvedValue("verified-access-token");
    __resetWarmupForTests();
    renderer.renderPdf.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    URL.createObjectURL = vi.fn(() => "blob:private-resume");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetches with authorization and revokes its local preview on unmount", async () => {
    vi.mocked(fetch).mockImplementation(async (url) =>
      url === "/api/health"
        ? new Response("{}")
        : new Response(new Blob(["%PDF-content"]), {
            headers: { "Content-Type": "application/pdf" },
          }),
    );
    const page = preview();
    expect(
      await screen.findByRole("figure", { name: /Resume preview/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(renderer.renderPdf).toHaveBeenCalledTimes(1));
    expect(screen.queryByTitle("Resume PDF")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/resume",
      expect.objectContaining({
        headers: { Authorization: "Bearer verified-access-token" },
        cache: "no-store",
      }),
    );
    expect(
      screen.getByRole("link", { name: "Download resume" }),
    ).toHaveAttribute("href", "blob:private-resume");
    page.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-resume");
  });

  it("warms the backend once on mount, without credentials", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
    preview();
    expect(fetch).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({ credentials: "omit" }),
    );
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(resumeCalls()).toHaveLength(2));
    const health = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => url === "/api/health");
    expect(health).toHaveLength(1);
  });

  it("explains a cold start when the request is slow", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));
      preview();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Loading your secure resume preview",
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2600);
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        "Waking up the server",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers retry after a rejected session without creating a preview", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
    preview();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "session could not be verified",
    );
    expect(screen.queryByTitle("Resume PDF")).not.toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(resumeCalls()).toHaveLength(2));
  });

  it("rejects an HTML static fallback instead of treating it as a PDF", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html></html>", {
        headers: { "Content-Type": "text/html" },
      }),
    );
    preview();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "resume service is unavailable",
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("shows the email gate and does not fetch without credentials", () => {
    auth.isAuthenticated = false;
    preview();
    expect(resumeCalls()).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Verify with email" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in with Auth0" }),
    ).toBeInTheDocument();
  });

  it("waits for the Auth0 session check instead of flashing the gate", () => {
    auth.isAuthenticated = false;
    auth.isLoading = true;
    preview();
    expect(
      screen.queryByRole("button", { name: "Verify with email" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Checking");
  });

  it("skips the gate and uses a valid stored email-code token", async () => {
    auth.isAuthenticated = false;
    setToken("otp-access-token", 1800);
    vi.mocked(fetch).mockImplementation(async (url) =>
      url === "/api/health"
        ? new Response("{}")
        : new Response(new Blob(["%PDF-content"]), {
            headers: { "Content-Type": "application/pdf" },
          }),
    );
    preview();
    expect(
      await screen.findByRole("figure", { name: /Resume preview/ }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/resume",
      expect.objectContaining({
        headers: { Authorization: "Bearer otp-access-token" },
      }),
    );
    expect(auth.getAccessTokenSilently).not.toHaveBeenCalled();
  });

  it("prefers the Auth0 token over a stored email-code token", async () => {
    setToken("otp-access-token", 1800);
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
    preview();
    await screen.findByRole("alert");
    expect(fetch).toHaveBeenCalledWith(
      "/api/resume",
      expect.objectContaining({
        headers: { Authorization: "Bearer verified-access-token" },
      }),
    );
  });

  it("clears a rejected email-code token and returns to the gate with a notice", async () => {
    auth.isAuthenticated = false;
    setToken("stale-token", 1800);
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
    preview();
    expect(
      await screen.findByRole("button", { name: "Verify with email" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/session expired/i)).toBeInTheDocument();
    expect(getToken()).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
