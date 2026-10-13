import { useEffect, useRef } from "react";
import { useTheme } from "@/theme/ThemeContext";
import { AlertCircle } from "lucide-react";

interface FieldError {
  field: string;
  label: string;
  message: string;
}

interface Props {
  errors: FieldError[];
  formId?: string;
}

export default function FormErrorSummary({ errors, formId }: Props) {
  const { colors } = useTheme();
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errors.length > 0) {
      summaryRef.current?.focus();
    }
  }, [errors]);

  if (errors.length === 0) return null;

  const scrollToField = (field: string) => {
    const prefix = formId ? `${formId}-` : "";
    const el =
      document.querySelector<HTMLElement>(`[name="${field}"]`) ??
      document.getElementById(`${prefix}${field}-form-item`);
    el?.focus();
    el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  };

  return (
    <div
      ref={summaryRef}
      role="alert"
      aria-labelledby="error-summary-heading"
      data-testid="error-summary"
      tabIndex={-1}
      className="rounded-lg border p-4 space-y-2 outline-none text-sm"
      style={{
        backgroundColor: colors.error + "10",
        borderColor: colors.error + "40",
        color: colors.error,
      }}
    >
      <div className="flex items-center gap-2 font-semibold">
        <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span id="error-summary-heading">
          {errors.length === 1
            ? "Please fix the following error:"
            : `Please fix the following ${errors.length} errors:`}
        </span>
      </div>
      <ul className="list-disc pl-6 space-y-1">
        {errors.map((err) => (
          <li key={err.field}>
            <button
              type="button"
              onClick={() => scrollToField(err.field)}
              className="underline underline-offset-2 text-left hover:opacity-80 focus:outline-none focus-visible:ring-2 rounded font-medium"
              style={{ color: colors.error }}
            >
              {err.label}
            </button>
            : {err.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
