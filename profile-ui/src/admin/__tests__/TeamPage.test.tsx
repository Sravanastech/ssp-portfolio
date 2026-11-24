import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamPage from "../TeamPage";
import { AdminContext } from "../AdminContext";
import type { Permission } from "../permissions";

const api = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/api/adminApi", async (orig) => ({
  ...(await orig<typeof import("@/api/adminApi")>()),
  adminFetch: api.adminFetch,
}));

const TOKEN = "t".repeat(43);
const team = {
  members: [
    {
      accountId: "o1",
      firstName: "Own",
      lastName: "Er",
      email: "o@x.com",
      role: "owner",
      canPublish: true,
      since: "2026-01-01T00:00:00Z",
    },
    {
      accountId: "e1",
      firstName: "Ed",
      lastName: "Itor",
      email: "e@x.com",
      role: "editor",
      canPublish: false,
      since: "2026-02-01T00:00:00Z",
    },
  ],
  invites: [
    {
      id: "i1",
      email: "new@x.com",
      canPublish: false,
      createdAt: "2026-03-01T00:00:00Z",
      expiresAt: "2026-03-08T00:00:00Z",
    },
  ],
};

type Init = { method?: string };

function renderTeam(
  perms: Permission[] = ["team.manage"],
  getToken: () => Promise<string> = async () => "tok",
) {
  return render(
    <MemoryRouter>
      <AdminContext.Provider
        value={{
          getToken,
          me: { role: "owner", canPublish: true, permissions: perms },
        }}
      >
        <TeamPage />
      </AdminContext.Provider>
    </MemoryRouter>,
  );
}

describe("TeamPage", () => {
  beforeEach(() => {
    api.adminFetch.mockReset();
    api.adminFetch.mockImplementation(
      async (_t: string, path: string, init?: Init) => {
        if (path === "/team" && !init?.method) return team;
        if (path === "/team/invites" && init?.method === "POST")
          return { id: "i2", token: TOKEN, expiresAt: "2026-03-08T00:00:00Z" };
        return undefined;
      },
    );
  });

  it("renders the forbidden message without team.manage", async () => {
    renderTeam([]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /does not include/,
    );
    expect(api.adminFetch).not.toHaveBeenCalled();
  });

  it("lists members and open invites; owner cannot be removed", async () => {
    renderTeam();
    expect(await screen.findByText("e@x.com")).toBeInTheDocument();
    expect(screen.getByText("new@x.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revoke invite for new@x.com" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove e@x.com" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove o@x.com" }),
    ).not.toBeInTheDocument();
  });

  it("toggles publish for an editor with PATCH", async () => {
    renderTeam();
    const toggle = await screen.findByRole("switch", {
      name: "Can publish: e@x.com",
    });
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(api.adminFetch).toHaveBeenCalledWith("tok", "/team/e1", {
        method: "PATCH",
        body: { canPublish: true },
      }),
    );
  });

  it("fetches a fresh access token before each request", async () => {
    let issued = 0;
    const getToken = vi.fn(async () => `t${++issued}`);
    renderTeam(["team.manage"], getToken);
    const toggle = await screen.findByRole("switch", {
      name: "Can publish: e@x.com",
    });
    expect(api.adminFetch).toHaveBeenCalledWith("t1", "/team");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(api.adminFetch).toHaveBeenCalledWith("t2", "/team/e1", {
        method: "PATCH",
        body: { canPublish: true },
      }),
    );
    await waitFor(() =>
      expect(api.adminFetch).toHaveBeenLastCalledWith("t3", "/team"),
    );
    expect(getToken).toHaveBeenCalledTimes(3);
  });

  it("shows the invite link once in a dialog and clears it on close", async () => {
    renderTeam();
    await screen.findByText("e@x.com");
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fresh@x.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText(
      "Invite link",
    ) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe(
      `${window.location.origin}/admin/invite#token=${TOKEN}`,
    );
    expect(
      within(dialog).getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
    expect(api.adminFetch).toHaveBeenCalledWith("tok", "/team/invites", {
      method: "POST",
      body: { email: "fresh@x.com", canPublish: false },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(document.body.innerHTML).not.toContain(TOKEN);
  });

  it("shows API failures next to the form", async () => {
    const { AdminApiError } = await import("@/api/adminApi");
    api.adminFetch.mockImplementation(
      async (_t: string, path: string, init?: Init) => {
        if (path === "/team" && !init?.method) return team;
        throw new AdminApiError("Too many invites. Try again later.", 429);
      },
    );
    renderTeam();
    await screen.findByText("e@x.com");
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fresh@x.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Too many invites/,
    );
  });
});
