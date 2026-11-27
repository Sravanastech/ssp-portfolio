import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InboxPage from "../InboxPage";
import { AdminContext } from "../AdminContext";
import type { Permission } from "../permissions";
import type { InquiryRow } from "@/api/adminApi";

const api = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/api/adminApi", async (orig) => ({
  ...(await orig<typeof import("@/api/adminApi")>()),
  adminFetch: api.adminFetch,
}));

const row = (over: Partial<InquiryRow> = {}): InquiryRow => ({
  id: "a1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+15550100",
  message: "Hello there",
  archived: false,
  created_at: "2026-03-01T10:00:00Z",
  delivery: "sent",
  replied_at: null,
  reply_count: 0,
  ...over,
});

type Calls = { method: string; path: string; body?: unknown };
let calls: Calls[];
let handlers: Record<string, (c: Calls) => unknown>;

function setup(rows: InquiryRow[], handlerMap = {}) {
  calls = [];
  handlers = handlerMap;
  api.adminFetch.mockImplementation(
    async (
      _t: string,
      path: string,
      init: { method?: string; body?: unknown } = {},
    ) => {
      const call = { method: init.method ?? "GET", path, body: init.body };
      calls.push(call);
      const key = `${call.method} ${path.split("?")[0]}`;
      if (handlers[key]) return handlers[key](call);
      if (key === "GET /inquiries") return rows;
      if (key.endsWith("/replies") && call.method === "GET") return [];
      return undefined;
    },
  );
}

async function apiError(code: string, status = 422) {
  const { AdminApiError } = await import("@/api/adminApi");
  return new AdminApiError(`msg:${code}`, status, code as never);
}

const refresh = vi.fn();
function renderInbox(
  perms: Permission[] = ["inquiries.manage", "inquiries.reply"],
) {
  return render(
    <AdminContext.Provider
      value={{
        getToken: async () => "tok",
        me: { role: "owner", canPublish: true, permissions: perms },
        refreshSummary: refresh,
      }}
    >
      <InboxPage />
    </AdminContext.Provider>,
  );
}

const openRow = async (name = "Ada Lovelace") =>
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(name) }),
  );

describe("InboxPage", () => {
  beforeEach(() => {
    api.adminFetch.mockReset();
    refresh.mockClear();
  });

  it("needs inquiries.manage", () => {
    setup([]);
    renderInbox([]);
    expect(screen.getByRole("alert")).toHaveTextContent(/does not include/);
  });

  it("filters Open / Replied / Archived client side", async () => {
    setup([
      row(),
      row({ id: "b2", name: "Bob", replied_at: "2026-03-02T00:00:00Z" }),
      row({ id: "c3", name: "Cy", archived: true }),
    ]);
    renderInbox();
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Replied/ }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Archived/ }));
    expect(screen.getByText("Cy")).toBeInTheDocument();
  });

  it("shows empty and error states", async () => {
    setup([]);
    const view = renderInbox();
    expect(await screen.findByText("No open messages.")).toBeInTheDocument();
    view.unmount();
    api.adminFetch.mockRejectedValue(new Error("x"));
    renderInbox();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Could not load messages/,
    );
  });

  it("loads more pages", async () => {
    const full = Array.from({ length: 25 }, (_, i) =>
      row({ id: `r${i}`, name: `Person ${i}` }),
    );
    setup(full, {
      "GET /inquiries": (c: Calls) =>
        c.path.endsWith("page=0") ? full : [row({ id: "z", name: "Zed" })],
    });
    renderInbox();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Zed")).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/inquiries?page=1")).toBe(true);
  });

  it("shows detail with mailto, tel and reply history", async () => {
    setup([row({ reply_count: 1 })], {
      "GET /inquiries/a1/replies": () => [
        {
          id: "r1",
          authorName: "Own Er",
          body: "Earlier answer",
          status: "sent",
          createdAt: "2026-03-02T00:00:00Z",
        },
      ],
    });
    renderInbox();
    await openRow();
    expect(
      await screen.findByRole("link", { name: "ada@example.com" }),
    ).toHaveAttribute("href", "mailto:ada@example.com");
    expect(screen.getByRole("link", { name: "+15550100" })).toHaveAttribute(
      "href",
      "tel:+15550100",
    );
    expect(await screen.findByText("Earlier answer")).toBeInTheDocument();
  });

  it("confirms, sends the reply and updates state", async () => {
    setup([row()], {
      "POST /inquiries/a1/replies": () => ({
        id: "r9",
        status: "sent",
        createdAt: "now",
      }),
    });
    renderInbox();
    await openRow();
    fireEvent.change(await screen.findByLabelText("Your reply"), {
      target: { value: "  Thanks for writing  " },
    });
    expect(document.getElementById("reply-count")).toHaveTextContent("22/5000");
    expect(
      screen.getByText(/Their reply goes to your inbox/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    // Nothing sent until confirmed.
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    fireEvent.click(await screen.findByRole("button", { name: "Send email" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toEqual({
        body: "Thanks for writing",
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByLabelText("Your reply")).toHaveValue(""),
    );
  });

  it("cancel in the confirm dialog sends nothing", async () => {
    setup([row()]);
    renderInbox();
    await openRow();
    fireEvent.change(await screen.findByLabelText("Your reply"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("disables send for blank or over-long replies", async () => {
    setup([row()]);
    renderInbox();
    await openRow();
    const send = await screen.findByRole("button", { name: "Send reply" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your reply"), {
      target: { value: "   " },
    });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your reply"), {
      target: { value: "x".repeat(5001) },
    });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your reply"), {
      target: { value: "ok" },
    });
    expect(send).toBeEnabled();
  });

  it("hides the composer without inquiries.reply", async () => {
    setup([row()]);
    renderInbox(["inquiries.manage"]);
    await openRow();
    expect(await screen.findByText("Replies")).toBeInTheDocument();
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument();
  });

  it("disables the composer when there is no email", async () => {
    setup([row({ email: null })]);
    renderInbox();
    await openRow();
    expect(
      await screen.findByText("No email — call or text +15550100"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Your reply")).not.toBeInTheDocument();
  });

  it("maps reply_rate_limited to a message", async () => {
    setup([row()]);
    const err = await apiError("reply_rate_limited", 429);
    handlers["POST /inquiries/a1/replies"] = () => {
      throw err;
    };
    renderInbox();
    await openRow();
    fireEvent.change(await screen.findByLabelText("Your reply"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    fireEvent.click(await screen.findByRole("button", { name: "Send email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /msg:reply_rate_limited/,
    );
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByLabelText("Your reply")).toHaveValue("hi");
  });

  it("offers Retry after email_failed and resends", async () => {
    setup([row()]);
    const err = await apiError("email_failed", 502);
    let attempts = 0;
    handlers["POST /inquiries/a1/replies"] = () => {
      attempts += 1;
      if (attempts === 1) throw err;
      return { id: "r2", status: "sent", createdAt: "now" };
    };
    renderInbox();
    await openRow();
    fireEvent.change(await screen.findByLabelText("Your reply"), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    fireEvent.click(await screen.findByRole("button", { name: "Send email" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(attempts).toBe(2));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("archives a message and drops it from Open", async () => {
    setup([row()]);
    renderInbox();
    await openRow();
    fireEvent.click(
      await screen.findByRole("button", { name: "Archive message" }),
    );
    await waitFor(() =>
      expect(calls.some((c) => c.method === "PATCH")).toBe(true),
    );
    expect(await screen.findByText("No open messages.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
