import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteContentProvider } from "./SiteContent";
import { useSiteContent } from "./siteContentContext";

function ProfileName() {
  return <p>{useSiteContent().profile.name}</p>;
}

describe("SiteContentProvider in api mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("renders the bundled snapshot while the site API is still pending", () => {
    vi.stubEnv("VITE_CONTENT_MODE", "api");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SiteContentProvider>
          <ProfileName />
        </SiteContentProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Sravana S Parimi")).toBeInTheDocument();
    expect(screen.queryByText(/Loading website/)).not.toBeInTheDocument();
  });
});
