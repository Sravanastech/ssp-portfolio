import { it, expect, vi, afterEach } from "vitest";
import { accountRequest } from "../accountApi";
afterEach(() => vi.unstubAllGlobals());
it("uses a verified bearer token for account provisioning and profile updates", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(() => Promise.resolve(new Response('{"id":"own"}')));
  vi.stubGlobal("fetch", fetch);
  await accountRequest("token", "POST", {
    firstName: "Name",
    lastName: "Engineer",
  });
  expect(fetch.mock.calls[0][0]).toBe("/api/me");
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    firstName: "Name",
    lastName: "Engineer",
  });
  await accountRequest("token", "PUT", {
    firstName: "Name",
    lastName: "Engineer",
    phone: "555",
  });
  expect(fetch.mock.calls[1][1].method).toBe("PUT");
});
it("expired session gives a sign-in recovery error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 401 })),
  );
  await expect(accountRequest("expired")).rejects.toThrow("Sign in");
});
