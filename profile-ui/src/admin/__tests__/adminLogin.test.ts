import { describe, expect, it } from "vitest";
import { adminLoginOptions, MFA_ACR } from "../adminLogin";

describe("adminLoginOptions", () => {
  it("requests MFA and returns to the admin page", () => {
    const o = adminLoginOptions("/admin/team");
    expect(o.authorizationParams?.acr_values).toBe(MFA_ACR);
    expect(o.appState).toEqual({ returnTo: "/admin/team" });
  });
});
