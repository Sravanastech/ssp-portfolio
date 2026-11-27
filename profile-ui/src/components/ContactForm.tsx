import { useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useInRouterContext } from "react-router-dom";
import { z } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import FormErrorSummary from "./FormErrorSummary";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { cv as colors, tint } from "@/theme/cssVars";
import { Send, Loader2 } from "lucide-react";

const contactFormSchema = z
  .object({
    name: z.string().trim().min(2, {
      message: "Please enter your full name.",
    }),
    email: z.string().trim().optional().or(z.literal("")),
    phone: z.string().trim().optional().or(z.literal("")),
    botcheck: z.boolean().optional(),
    message: z.string().trim().min(10, {
      message: "Please tell me a bit more (at least 10 characters).",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid email address.",
          path: ["email"],
        });
      }
    }

    if (!data.email && !data.phone) {
      const msg =
        "Either an email address or a phone number is required so I can get in touch with you.";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: msg,
        path: ["email"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: msg,
        path: ["phone"],
      });
    }
  });

export type ContactFormData = z.infer<typeof contactFormSchema>;

type Props = {
  onSubmit: (data: ContactFormData) => void | Promise<void>;
  isLoading?: boolean;
  /** Human-verification slot rendered above the send button. */
  captcha?: ReactNode;
  /** When false the form cannot be sent yet (verification pending). */
  captchaReady?: boolean;
};

const ContactForm = ({
  onSubmit,
  isLoading = false,
  captcha,
  captchaReady = true,
}: Props) => {
  const submitting = useRef(false);
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const inRouter = useInRouterContext();
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      botcheck: false,
    },
    mode: "onBlur",
  });

  const { trigger } = form;

  const onInvalid = () => {
    setShowErrorSummary(true);
  };

  const submitOnce = async (data: ContactFormData) => {
    if (isLoading || submitting.current || !captchaReady) return;
    submitting.current = true;
    try {
      await onSubmit(data);
      setShowErrorSummary(false);
    } finally {
      submitting.current = false;
    }
  };

  const handleContactChange = () => {
    setTimeout(() => {
      trigger(["email", "phone"]);
    }, 50);
  };

  // Add handler for Ctrl/Cmd+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void form.handleSubmit(submitOnce)(e);
    }
  };

  const inputStyle = {
    backgroundColor: colors.background,
    color: colors.text,
    borderColor: colors.border,
  };

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submitOnce, onInvalid)}
        aria-busy={isLoading || form.formState.isSubmitting}
        onKeyDown={handleKeyDown}
        className="space-y-6 w-full p-6 md:p-8 rounded-[6px] border"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <div className="space-y-2 mb-6">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: colors.primary }}
          >
            Send a message
          </h2>
          <p className="text-base" style={{ color: colors.textSecondary }}>
            Share the role or opportunity, and include a way to reach you.
          </p>
        </div>

        {showErrorSummary && Object.keys(form.formState.errors).length > 0 && (
          <FormErrorSummary
            errors={Object.entries(form.formState.errors)
              .filter(([key]) => key !== "botcheck")
              .map(([key, err]) => ({
                field: key,
                label:
                  key === "name"
                    ? "Name"
                    : key === "email"
                      ? "Email address"
                      : key === "phone"
                        ? "Phone number"
                        : key === "message"
                          ? "Message"
                          : key,
                message:
                  (err as { message?: string })?.message ??
                  "This field has an error.",
              }))}
          />
        )}

        <input
          type="checkbox"
          {...form.register("botcheck")}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ display: "none" }}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel
                className="text-sm font-medium flex items-center gap-1"
                style={{ color: colors.text }}
              >
                Name <span style={{ color: colors.error }}>*</span>
              </FormLabel>
              <FormControl>
                <div className="relative flex items-center">
                  <Input
                    {...field}
                    maxLength={100}
                    aria-invalid={!!form.formState.errors.name}
                    aria-describedby={
                      form.formState.errors.name ? "name-error" : undefined
                    }
                    className="h-12 px-4 rounded-[6px] text-sm md:text-base border transition-all focus-visible:ring-2"
                    style={inputStyle}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              </FormControl>
              <FormMessage id="name-error" style={{ color: colors.error }} />
            </FormItem>
          )}
        />

        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span
              className="text-sm font-medium flex items-center gap-1.5"
              style={{ color: colors.text }}
            >
              Contact methods
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: colors.textSecondary }}
            >
              I'll respond at either your email or phone number — whichever you
              prefer.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel
                    className="text-sm font-medium flex items-center gap-1.5"
                    style={{ color: colors.text }}
                  >
                    Email address
                  </FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Input
                        {...field}
                        type="email"
                        maxLength={254}
                        onChange={(e) => {
                          field.onChange(e);
                          handleContactChange();
                        }}
                        className={`h-12 pl-4 pr-12 rounded-[6px] text-sm md:text-base border transition-all focus-visible:ring-2 ${
                          form.formState.errors.email
                            ? "ring-2 ring-red-500"
                            : ""
                        }`}
                        style={{
                          ...inputStyle,
                          backgroundColor: form.formState.errors.email
                            ? tint("error", 12)
                            : inputStyle.backgroundColor,
                        }}
                        placeholder="example@mail.com"
                        inputMode="email"
                        autoComplete="email"
                        aria-invalid={!!form.formState.errors.email}
                        aria-describedby={
                          form.formState.errors.email
                            ? "email-error"
                            : undefined
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage
                    id="email-error"
                    style={{ color: colors.error }}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel
                    className="text-sm font-medium flex items-center gap-1.5"
                    style={{ color: colors.text }}
                  >
                    Phone number
                  </FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Input
                        {...field}
                        type="tel"
                        maxLength={25}
                        onChange={(e) => {
                          field.onChange(e);
                          handleContactChange();
                        }}
                        className={`h-12 pl-4 pr-12 rounded-[6px] text-sm md:text-base border transition-all focus-visible:ring-2 ${
                          form.formState.errors.phone
                            ? "ring-2 ring-red-500"
                            : ""
                        }`}
                        style={{
                          ...inputStyle,
                          backgroundColor: form.formState.errors.phone
                            ? tint("error", 12)
                            : inputStyle.backgroundColor,
                        }}
                        placeholder="(555) 123-4567"
                        autoComplete="tel"
                        aria-invalid={!!form.formState.errors.phone}
                        aria-describedby={
                          form.formState.errors.phone
                            ? "phone-error"
                            : undefined
                        }
                      />
                    </div>
                  </FormControl>
                  <FormMessage
                    id="phone-error"
                    style={{ color: colors.error }}
                  />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel
                className="text-sm font-medium flex items-center gap-1"
                style={{ color: colors.text }}
              >
                Message <span style={{ color: colors.error }}>*</span>
              </FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={4}
                  maxLength={5000}
                  aria-invalid={!!form.formState.errors.message}
                  aria-describedby={
                    form.formState.errors.message ? "message-error" : undefined
                  }
                  className="w-full rounded-[6px] border p-4 text-sm md:text-base focus-visible:outline-none focus-visible:ring-2 transition-all"
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                  placeholder="Tell me about the role, the team, or your questions…"
                />
              </FormControl>
              <FormMessage id="message-error" style={{ color: colors.error }} />
            </FormItem>
          )}
        />

        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
          style={{ color: colors.textSecondary }}
        >
          <p>
            Your message is processed securely.{" "}
            {inRouter ? (
              <Link to="/privacy" className="underline underline-offset-4">
                How your information is handled
              </Link>
            ) : (
              <a href="/privacy" className="underline underline-offset-4">
                How your information is handled
              </a>
            )}
          </p>
          <p className="fui-touch-hide text-[0.8125rem] whitespace-nowrap">
            ⌘↵ to send
          </p>
        </div>

        {captcha && <div className="contact-captcha">{captcha}</div>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || form.formState.isSubmitting}
            aria-disabled={!captchaReady || undefined}
            className="studio-button w-full h-12 rounded-[6px] flex items-center justify-center gap-2 font-medium text-base transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
            style={{
              backgroundColor: colors.primary,
              color: colors.accent,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending message…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send message
              </>
            )}
          </button>
        </div>
        <div aria-live="polite" className="sr-only" id="contact-form-status" />
      </form>
    </Form>
  );
};

export default ContactForm;
