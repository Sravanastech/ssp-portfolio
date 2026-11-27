import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/auth";
import { accountRequest } from "@/api/accountApi";
import { resetIsAdminCache } from "@/hooks/useIsAdmin";
import AuthDropdown from "../AuthDropdown";
import MobileMenu from "../MobileMenu";

vi.mock("@/auth/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/api/accountApi", () => ({ accountRequest: vi.fn() }));
vi.mock("@/content/siteContentContext", () => ({
  useSiteContent: () => ({ navigation: [] }),
}));
vi.mock("@/content/SiteContent", () => ({ SiteText: () => null }));

const auth = (isAuthenticated: boolean) =>
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
    getAccessTokenSilently: vi.fn().mockResolvedValue("tok"),
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    user: isAuthenticated ? { sub: "auth0|1", email: "o@x.com" } : undefined,
  } as never);

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(() => {
  vi.clearAllMocks();
  resetIsAdminCache();
});

describe("AuthDropdown admin item", () => {
  const open = () =>
    fireEvent.click(screen.getByLabelText("User account menu"));

  it("shows Admin between Account and Logout for admins", async () => {
    auth(true);
    vi.mocked(accountRequest).mockResolvedValue({ admin: true } as never);
    wrap(<AuthDropdown />);
    await waitFor(() => expect(accountRequest).toHaveBeenCalled());
    open();
    const items = (await screen.findAllByRole("menuitem")).map(
      (i) => i.textContent,
    );
    expect(items).toEqual(["Account", "Admin", "Logout"]);
  });

  it("hides Admin for non-admins", async () => {
    auth(true);
    vi.mocked(accountRequest).mockResolvedValue({ admin: false } as never);
    wrap(<AuthDropdown />);
    await waitFor(() => expect(accountRequest).toHaveBeenCalled());
    open();
    expect(screen.queryByRole("menuitem", { name: "Admin" })).toBeNull();
  });

  it("hides Admin and skips the API for anonymous visitors", () => {
    auth(false);
    wrap(<AuthDropdown />);
    expect(screen.queryByText("Admin")).toBeNull();
    expect(accountRequest).not.toHaveBeenCalled();
  });
});

describe("MobileMenu admin link", () => {
  const open = () =>
    fireEvent.click(screen.getByLabelText("Open navigation menu"));

  it("shows Admin link for admins", async () => {
    auth(true);
    vi.mocked(accountRequest).mockResolvedValue({ admin: true } as never);
    wrap(<MobileMenu />);
    open();
    const link = await screen.findByRole("link", { name: /Admin/ });
    expect(link.getAttribute("href")).toBe("/admin");
  });

  it("hides Admin link for non-admins", async () => {
    auth(true);
    vi.mocked(accountRequest).mockResolvedValue({ admin: false } as never);
    wrap(<MobileMenu />);
    open();
    await waitFor(() => expect(accountRequest).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: /Admin/ })).toBeNull();
  });

  it("hides Admin link for anonymous visitors", () => {
    auth(false);
    wrap(<MobileMenu />);
    open();
    expect(screen.queryByRole("link", { name: /Admin/ })).toBeNull();
    expect(accountRequest).not.toHaveBeenCalled();
  });
});
