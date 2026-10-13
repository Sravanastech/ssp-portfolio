import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/theme/ThemeContext";
import ContactPage from "../ContactPage";

vi.mock("@/lib/monitoring", () => ({ reportEvent: vi.fn() }));

function openContact() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HelmetProvider>
        <ThemeProvider>
          <ContactPage />
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByPlaceholderText("Your Name"), {
    target: { value: "Test Person" },
  });
  fireEvent.change(screen.getByPlaceholderText("example@mail.com"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(
    screen.getByPlaceholderText(
      "Tell me about your project, idea, or questions...",
    ),
    { target: { value: "Please discuss this project with me." } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
}

describe("contact delivery experience", () => {
  beforeEach(() => vi.stubEnv("VITE_WEB3FORMS_ACCESS_KEY", "test-key"));
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
    expect(screen.getByPlaceholderText("Your Name")).toHaveValue("Test Person");
    expect(
      screen.getByPlaceholderText(
        "Tell me about your project, idea, or questions...",
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
      screen.getByRole("button", { name: "Send Another Message" }),
    );
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Your Name")).toHaveValue(""),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
