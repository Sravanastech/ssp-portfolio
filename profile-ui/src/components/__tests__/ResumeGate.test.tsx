import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ResumeGate from "../ResumeGate";
import { OtpApiError } from "@/lib/resumeOtpApi";
import { clear, getToken } from "@/lib/otpSession";

const api = vi.hoisted(() => ({ requestOtp: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/lib/resumeOtpApi", async (orig) => ({
  ...(await orig<typeof import("@/lib/resumeOtpApi")>()),
  ...api,
}));
const auth = vi.hoisted(() => ({ loginWithRedirect: vi.fn() }));
vi.mock("@/auth/auth", () => ({ useAuth: () => auth }));
vi.mock("../TurnstileWidget", () => ({
  default: ({
    onToken,
    onExpire,
    resetKey,
  }: {
    onToken: (t: string) => void;
    onExpire: () => void;
    resetKey?: number;
  }) => (
    <>
      <button
        type="button"
        data-testid="turnstile"
        data-reset={resetKey ?? 0}
        onClick={() => onToken("ts-token")}
      >
        solve
      </button>
      <button type="button" data-testid="expire" onClick={onExpire}>
        expire
      </button>
    </>
  ),
}));

const CHALLENGE = {
  challengeId: "3f2b8c1e-5d4a-4c8e-9a1b-0123456789ab",
  resendAfterSeconds: 45,
  expiresInSeconds: 600,
};
const boxes = () => screen.getAllByRole("textbox", { name: /Digit/ });
const enterCode = (code: string) =>
  fireEvent.paste(boxes()[0], { clipboardData: { getData: () => code } });

async function toCodeStep(onVerified = vi.fn()) {
  api.requestOtp.mockResolvedValueOnce(CHALLENGE);
  render(<ResumeGate onVerified={onVerified} />);
  fireEvent.click(screen.getByRole("button", { name: "Verify with email" }));
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "me@example.com" },
  });
  fireEvent.click(screen.getByTestId("turnstile"));
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));
  await screen.findByRole("group", { name: "Verification code" });
  return onVerified;
}

describe("ResumeGate", () => {
  beforeEach(() => {
    clear();
    sessionStorage.clear();
    Object.values(api).forEach((f) => f.mockReset());
    auth.loginWithRedirect.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("starts on the choose step with one primary action and the privacy note", () => {
    render(<ResumeGate onVerified={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Verify with email" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your email is stored so the owner can see who viewed the resume, until the owner deletes it.",
      ),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".studio-button")).toHaveLength(1);
  });

  it("falls back to Auth0 sign-in returning to /resume", () => {
    render(<ResumeGate onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Auth0" }));
    expect(auth.loginWithRedirect).toHaveBeenCalledWith({
      appState: { returnTo: "/resume" },
    });
  });

  it("shows the session-expired notice", () => {
    render(<ResumeGate onVerified={vi.fn()} notice="Your session expired." />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your session expired.",
    );
  });

  it("rejects an invalid email with a focused error summary and no request", async () => {
    render(<ResumeGate onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify with email" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByTestId("turnstile"));
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    const summary = await screen.findByTestId("error-summary");
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("valid email");
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.requestOtp).not.toHaveBeenCalled();
  });

  it("keeps Send code aria-disabled with status text until a token arrives", () => {
    render(<ResumeGate onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify with email" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "me@example.com" },
    });
    const send = screen.getByRole("button", { name: "Send code" });
    expect(send).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/Checking that you.re human/)).toBeInTheDocument();
    fireEvent.click(send);
    expect(api.requestOtp).not.toHaveBeenCalled();
    expect(screen.queryByTestId("error-summary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("turnstile"));
    expect(send).not.toHaveAttribute("aria-disabled", "true");
    expect(
      screen.queryByText(/Checking that you.re human/),
    ).not.toBeInTheDocument();
  });

  it("announces the check status politely", () => {
    render(<ResumeGate onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify with email" }));
    const status = screen.getByText(/Checking that you.re human/);
    expect(status.closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("re-disables after a send until a fresh token arrives", async () => {
    await toCodeStep();
    expect(screen.getByRole("button", { name: /Resend code/ })).toBeDisabled();
    expect(screen.getByText(/Checking that you.re human/)).toBeInTheDocument();
  });

  it("on token expiry disables sending, explains, and offers a retry", async () => {
    render(<ResumeGate onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify with email" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "me@example.com" },
    });
    fireEvent.click(screen.getByTestId("turnstile"));
    fireEvent.click(screen.getByTestId("expire"));
    const send = screen.getByRole("button", { name: "Send code" });
    expect(send).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/expired or failed/i)).toBeInTheDocument();
    fireEvent.click(send);
    expect(await screen.findByTestId("error-summary")).toHaveTextContent(
      "verification check",
    );
    expect(api.requestOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry check" }));
    expect(screen.getByTestId("turnstile")).toHaveAttribute("data-reset", "1");
    expect(screen.getByText(/Checking that you.re human/)).toBeInTheDocument();
  });

  it("sends the code with the Turnstile token and moves to the code step", async () => {
    await toCodeStep();
    expect(api.requestOtp).toHaveBeenCalledWith("me@example.com", "ts-token");
    expect(screen.getByRole("status")).toHaveTextContent("me@example.com");
    expect(boxes()).toHaveLength(6);
  });

  it("verifies on the sixth digit, stores the token and signals success", async () => {
    const onVerified = await toCodeStep();
    api.verifyOtp.mockResolvedValueOnce({
      accessToken: "access-123",
      expiresInSeconds: 1800,
    });
    enterCode("123456");
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    expect(api.verifyOtp).toHaveBeenCalledWith(CHALLENGE.challengeId, "123456");
    expect(getToken()).toBe("access-123");
    expect(window.location.href).not.toContain("access-123");
  });

  it("shows attempts remaining on a wrong code, focuses the summary and clears the boxes", async () => {
    await toCodeStep();
    api.verifyOtp.mockRejectedValueOnce(
      new OtpApiError("invalid_code", 400, { attemptsRemaining: 3 }),
    );
    enterCode("000000");
    const summary = await screen.findByTestId("error-summary");
    expect(summary).toHaveTextContent("3 attempts left");
    expect(summary).toHaveFocus();
    expect(boxes()[0]).toHaveAttribute("aria-invalid", "true");
    await waitFor(() =>
      expect(boxes().every((b) => (b as HTMLInputElement).value === "")).toBe(
        true,
      ),
    );
    expect(summary).toHaveFocus();
    expect(getToken()).toBeNull();
  });

  it("explains a lockout and offers Auth0", async () => {
    await toCodeStep();
    api.verifyOtp.mockRejectedValueOnce(
      new OtpApiError("locked", 429, { retryAfterSeconds: 3600 }),
    );
    enterCode("111111");
    expect(await screen.findByTestId("error-summary")).toHaveTextContent(
      "Too many incorrect codes",
    );
    expect(
      screen.getByRole("button", { name: "Sign in with Auth0" }),
    ).toBeInTheDocument();
  });

  it("disables the boxes while verifying and ignores double submits", async () => {
    await toCodeStep();
    let resolve!: (v: unknown) => void;
    api.verifyOtp.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    enterCode("123456");
    expect(boxes().every((b) => (b as HTMLInputElement).disabled)).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("Verifying");
    enterCode("654321");
    expect(api.verifyOtp).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ accessToken: "t", expiresInSeconds: 60 }));
  });

  it("counts down before resend is allowed, then resends with a fresh token", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await toCodeStep();
    const resend = screen.getByRole("button", { name: /Resend code/ });
    expect(resend).toBeDisabled();
    expect(resend).toHaveTextContent("45");
    for (let i = 0; i < 45; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(screen.getByRole("button", { name: "Resend code" })).toBeDisabled();
    fireEvent.click(screen.getByTestId("turnstile"));
    const ready = screen.getByRole("button", { name: "Resend code" });
    expect(ready).toBeEnabled();
    api.requestOtp.mockResolvedValueOnce(CHALLENGE);
    fireEvent.click(ready);
    await waitFor(() => expect(api.requestOtp).toHaveBeenCalledTimes(2));
    expect(api.requestOtp).toHaveBeenLastCalledWith(
      "me@example.com",
      "ts-token",
    );
    expect(screen.getByRole("button", { name: /Resend code/ })).toBeDisabled();
  });

  it("lets the visitor edit the email and returns to the email step", async () => {
    await toCodeStep();
    fireEvent.click(screen.getByRole("button", { name: /Wrong email/ }));
    expect(screen.getByLabelText("Email address")).toHaveValue(
      "me@example.com",
    );
  });

  it.each([
    ["captcha_failed", /verification check failed/i],
    ["rate_limited", /too many/i],
    ["otp_unavailable", /unavailable/i],
    ["send_failed", /could not send/i],
    ["network", /could not reach/i],
  ])("maps send error %s to a clear message", async (code, text) => {
    api.requestOtp.mockRejectedValueOnce(
      new OtpApiError(code as never, 429, { retryAfterSeconds: 120 }),
    );
    render(<ResumeGate onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Verify with email" }));
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "me@example.com" },
    });
    fireEvent.click(screen.getByTestId("turnstile"));
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByTestId("error-summary")).toHaveTextContent(text);
    expect(screen.getByTestId("turnstile")).toHaveAttribute("data-reset", "1");
  });
});
