import { useMutation } from "@tanstack/react-query";
import type { ContactFormData } from "@/components/ContactForm";

type Web3FormsResponse = {
  success: boolean;
  message: string;
};

export const CONTACT_TIMEOUT_MS = 15_000;
const requestKeys = new Map<string, string>();

/** `api` (default) posts to the backend; `web3forms` is a build-time fallback. */
export const contactMode = (): "api" | "web3forms" =>
  import.meta.env.VITE_CONTACT_MODE === "web3forms" ? "web3forms" : "api";

export type ContactErrorCode =
  | "captcha_required"
  | "captcha_failed"
  | "rate_limited"
  | "unavailable"
  | "rejected"
  | "conflict"
  | "invalid";

export class ContactApiError extends Error {
  constructor(
    message: string,
    readonly code: ContactErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ContactApiError";
  }
}

const apiFailure = async (response: Response) => {
  let code = "";
  try {
    code = String(((await response.json()) as { code?: unknown }).code ?? "");
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 429 || code === "rate_limited")
    return new ContactApiError(
      "Too many messages from your network. Please wait a while before trying again, or use the email link.",
      "rate_limited",
    );
  if (code === "captcha_required" || code === "captcha_failed")
    return new ContactApiError(
      "The verification check was not accepted. Your text is still here; complete the check again and retry.",
      code,
    );
  if (response.status === 503)
    return new ContactApiError(
      "The contact form is temporarily unavailable. Please use the email link.",
      "unavailable",
    );
  if (response.status === 409)
    return new ContactApiError(
      "This message was already used with a different text. Please reload the page and send it again.",
      "conflict",
    );
  if (response.status === 400)
    return new ContactApiError(
      "Some details were not accepted. Check the fields, your text is still here.",
      "invalid",
    );
  return new ContactApiError(
    "The message was not accepted. Your text is still here; please retry.",
    "rejected",
  );
};

const submitToBackend = async (
  formData: ContactFormData,
  turnstileToken: string | undefined,
) => {
  if (!turnstileToken)
    throw new ContactApiError(
      "Please complete the verification check before sending.",
      "captcha_required",
    );
  const payload = {
    name: formData.name,
    email: formData.email || null,
    phone: formData.phone || null,
    message: formData.message,
    website: formData.botcheck ? "filled" : "",
  };
  // The token is single use and differs per attempt, so it is excluded from the
  // fingerprint: retrying the same text reuses the idempotency key.
  const fingerprint = JSON.stringify(payload);
  const key = requestKeys.get(fingerprint) ?? crypto.randomUUID();
  requestKeys.set(fingerprint, key);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS);
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ ...payload, turnstileToken }),
    });
    if (!response.ok) throw await apiFailure(response);
    requestKeys.delete(fingerprint);
    return await response.json();
  } catch (error) {
    if (error instanceof ContactApiError) throw error;
    if (controller.signal.aborted)
      throw new ContactApiError(
        "The request timed out. Your message may have been accepted; retrying the same text will not create a duplicate.",
        "unavailable",
        { cause: error },
      );
    throw new ContactApiError(
      "Delivery could not be confirmed. Check your connection and try again, or use the email link.",
      "unavailable",
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
};

export const submitContactInquiry = async (
  formData: ContactFormData,
  turnstileToken?: string,
) => {
  if (contactMode() === "api") return submitToBackend(formData, turnstileToken);
  const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();

  if (!accessKey) {
    throw new Error(
      "The contact form is temporarily unavailable. Please use the email link below.",
    );
  }
  if (formData.botcheck) {
    throw new Error(
      "This submission could not be verified. Please use the email link below.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `New Portfolio Inquiry from ${formData.name}`,
        from_name: "Sravana Portfolio",
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        message: formData.message,
        botcheck: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        "The message service is unavailable. Please try again or use the email link below.",
      );
    }

    const data: Web3FormsResponse = await response.json();
    if (data.success !== true) {
      throw new Error(
        "The message service did not accept your message. Please try again or email directly.",
      );
    }

    return data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "The request timed out and delivery could not be confirmed. Your message is still here; you can retry or email directly.",
        { cause: error },
      );
    }
    if (error instanceof TypeError || error instanceof SyntaxError) {
      throw new Error(
        "Delivery could not be confirmed. Check your connection and try again, or use the email link below.",
        { cause: error },
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const useSubmitContactInquiry = () => {
  const {
    mutateAsync: submitInquiry,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  } = useMutation({
    mutationFn: (input: { data: ContactFormData; token?: string }) =>
      submitContactInquiry(input.data, input.token),
    retry: false,
  });

  return {
    submitInquiry,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  };
};
