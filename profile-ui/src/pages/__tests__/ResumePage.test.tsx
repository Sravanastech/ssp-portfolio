import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import ResumePage from "../ResumePage";

const auth = vi.hoisted(() => ({
  getAccessTokenSilently: vi.fn(),
  isAuthenticated: true,
}));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));

function preview() {
  return render(
    <HelmetProvider>
      <ResumePage />
    </HelmetProvider>,
  );
}

describe("secure resume preview", () => {
  beforeEach(() => {
    auth.isAuthenticated = true;
    auth.getAccessTokenSilently.mockResolvedValue("verified-access-token");
    vi.stubGlobal("fetch", vi.fn());
    URL.createObjectURL = vi.fn(() => "blob:private-resume");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("fetches with authorization and revokes its local preview on unmount", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Blob(["%PDF-content"]), {
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    const page = preview();
    expect(await screen.findByTitle("Resume PDF")).toHaveAttribute(
      "src",
      "blob:private-resume",
    );
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

  it("offers retry after a rejected session without creating a preview", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
    preview();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "session could not be verified",
    );
    expect(screen.queryByTitle("Resume PDF")).not.toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
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

  it("does not fetch before authentication", () => {
    auth.isAuthenticated = false;
    preview();
    expect(fetch).not.toHaveBeenCalled();
  });
});
