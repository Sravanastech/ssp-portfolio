import { useMutation } from "@tanstack/react-query";
import type { ContactFormData } from "@/components/ContactForm";

type Web3FormsResponse = {
  success: boolean;
  message: string;
};

export const CONTACT_TIMEOUT_MS = 15_000;
const requestKeys = new Map<string, string>();

export const submitContactInquiry = async (formData: ContactFormData) => {
  if (import.meta.env.VITE_CONTENT_MODE === "api") {
    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      message: formData.message,
      website: formData.botcheck ? "filled" : "",
    };
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
        body: fingerprint,
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "Too many messages. Please wait before trying again."
            : "The message was not accepted. Your text is still here; please retry.",
        );
      requestKeys.delete(fingerprint);
      return await response.json();
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error(
          "The request timed out. Your message may have been accepted; retrying the same text will not create a duplicate.",
          { cause: error },
        );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
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
    mutationFn: submitContactInquiry,
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
