import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Account, AccountProfileUpdate } from "@/api/accountApi";
import {
  User,
  Phone,
  MapPin,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  Lock,
} from "lucide-react";

const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(80, "First name cannot exceed 80 characters."),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(80, "Last name cannot exceed 80 characters."),
  phone: z
    .string()
    .trim()
    .max(32, "Phone number cannot exceed 32 characters.")
    .refine(
      (val) => !val || /^[\d\s+().-]{7,32}$/.test(val),
      "Please enter a valid phone number (digits, spaces, +, -).",
    ),
  addressLine1: z
    .string()
    .trim()
    .max(120, "Address cannot exceed 120 characters."),
  addressLine2: z
    .string()
    .trim()
    .max(120, "Address line 2 cannot exceed 120 characters."),
  city: z.string().trim().max(80, "City cannot exceed 80 characters."),
  region: z
    .string()
    .trim()
    .max(80, "State / Province cannot exceed 80 characters."),
  postalCode: z
    .string()
    .trim()
    .max(20, "Postal code cannot exceed 20 characters.")
    .refine(
      (val) => !val || /^[A-Za-z0-9\s-]{3,20}$/.test(val),
      "Please enter a valid postal or ZIP code.",
    ),
  country: z.string().trim().max(80, "Country cannot exceed 80 characters."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const emptyProfile: ProfileFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

function toFormValues(account?: Account | null): ProfileFormValues {
  return {
    firstName: account?.firstName ?? "",
    lastName: account?.lastName ?? "",
    phone: account?.phone ?? "",
    addressLine1: account?.addressLine1 ?? "",
    addressLine2: account?.addressLine2 ?? "",
    city: account?.city ?? "",
    region: account?.region ?? "",
    postalCode: account?.postalCode ?? "",
    country: account?.country ?? "",
  };
}

interface AccountProfileFormProps {
  account: Account | null;
  userEmail?: string;
  saving: boolean;
  onSave: (payload: AccountProfileUpdate) => Promise<void>;
  onDiscard: () => void;
}

export function AccountProfileForm({
  account,
  userEmail,
  saving,
  onSave,
  onDiscard,
}: AccountProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyProfile,
    mode: "onTouched",
  });

  useEffect(() => {
    if (account) {
      reset(toFormValues(account));
    }
  }, [account, reset]);

  const submitValues = async (values: ProfileFormValues) => {
    const payload: AccountProfileUpdate = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim() || null,
      addressLine1: values.addressLine1.trim() || null,
      addressLine2: values.addressLine2.trim() || null,
      city: values.city.trim() || null,
      region: values.region.trim() || null,
      postalCode: values.postalCode.trim() || null,
      country: values.country.trim() || null,
    };
    await onSave(payload);
  };

  const handleDiscard = () => {
    if (account) {
      reset(toFormValues(account));
    }
    onDiscard();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit(submitValues)(e);
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(submitValues)}
      onKeyDown={handleKeyDown}
      aria-busy={saving}
      className="ops-stack"
    >
      <section className="page-panel" aria-labelledby="personal-title">
        <h2 className="panel-title" id="personal-title">
          <User size={20} aria-hidden="true" />
          Personal Details
        </h2>
        <div className="field-grid">
          <Field
            id="firstName"
            label="First name"
            required
            error={errors.firstName?.message}
          >
            <input
              id="firstName"
              {...register("firstName")}
              autoComplete="given-name"
              placeholder="Jane"
              maxLength={80}
              className="field-input"
              aria-invalid={errors.firstName ? "true" : "false"}
            />
          </Field>
          <Field
            id="lastName"
            label="Last name"
            required
            error={errors.lastName?.message}
          >
            <input
              id="lastName"
              {...register("lastName")}
              autoComplete="family-name"
              placeholder="Doe"
              maxLength={80}
              className="field-input"
              aria-invalid={errors.lastName ? "true" : "false"}
            />
          </Field>
        </div>
      </section>

      <section className="page-panel" aria-labelledby="contact-title">
        <h2 className="panel-title" id="contact-title">
          <Phone size={20} aria-hidden="true" />
          Contact Details
        </h2>
        <div className="field-grid">
          <Field
            id="phone"
            label="Phone number"
            error={errors.phone?.message}
            hint="Optional. Used for direct contact inquiries."
          >
            <input
              id="phone"
              type="tel"
              {...register("phone")}
              autoComplete="tel"
              placeholder="+1 (555) 123-4567"
              maxLength={32}
              className="field-input"
              aria-invalid={errors.phone ? "true" : "false"}
            />
          </Field>
          <Field
            id="verifiedEmail"
            label="Sign-in email"
            hint="Verified through Auth0 identity provider (read-only)."
          >
            <div className="field-lock">
              <input
                id="verifiedEmail"
                type="email"
                value={account?.email ?? userEmail ?? ""}
                readOnly
                disabled
                className="field-input"
              />
              <Lock size={16} aria-hidden="true" />
            </div>
          </Field>
        </div>
      </section>

      <section className="page-panel" aria-labelledby="address-title">
        <h2 className="panel-title" id="address-title">
          <MapPin size={20} aria-hidden="true" />
          Mailing Address
        </h2>
        <div className="field-stack">
          <Field
            id="addressLine1"
            label="Street address"
            error={errors.addressLine1?.message}
          >
            <input
              id="addressLine1"
              {...register("addressLine1")}
              autoComplete="address-line1"
              placeholder="123 Innovation Way"
              maxLength={120}
              className="field-input"
              aria-invalid={errors.addressLine1 ? "true" : "false"}
            />
          </Field>
          <Field
            id="addressLine2"
            label="Apartment, suite, unit"
            optional
            error={errors.addressLine2?.message}
          >
            <input
              id="addressLine2"
              {...register("addressLine2")}
              autoComplete="address-line2"
              placeholder="Suite 400"
              maxLength={120}
              className="field-input"
              aria-invalid={errors.addressLine2 ? "true" : "false"}
            />
          </Field>
          <div className="field-grid">
            <Field id="city" label="City" error={errors.city?.message}>
              <input
                id="city"
                {...register("city")}
                autoComplete="address-level2"
                placeholder="Cincinnati"
                maxLength={80}
                className="field-input"
                aria-invalid={errors.city ? "true" : "false"}
              />
            </Field>
            <Field
              id="region"
              label="State / Province / Region"
              error={errors.region?.message}
            >
              <input
                id="region"
                {...register("region")}
                autoComplete="address-level1"
                placeholder="OH"
                maxLength={80}
                className="field-input"
                aria-invalid={errors.region ? "true" : "false"}
              />
            </Field>
          </div>
          <div className="field-grid">
            <Field
              id="postalCode"
              label="Postal / ZIP code"
              error={errors.postalCode?.message}
            >
              <input
                id="postalCode"
                {...register("postalCode")}
                autoComplete="postal-code"
                placeholder="45202"
                maxLength={20}
                className="field-input"
                aria-invalid={errors.postalCode ? "true" : "false"}
              />
            </Field>
            <Field id="country" label="Country" error={errors.country?.message}>
              <input
                id="country"
                list="country-suggestions"
                {...register("country")}
                autoComplete="country-name"
                placeholder="United States"
                maxLength={80}
                className="field-input"
                aria-invalid={errors.country ? "true" : "false"}
              />
              <datalist id="country-suggestions">
                <option value="United States" />
                <option value="Canada" />
                <option value="United Kingdom" />
                <option value="India" />
                <option value="Australia" />
                <option value="Germany" />
                <option value="France" />
                <option value="Japan" />
                <option value="Singapore" />
              </datalist>
            </Field>
          </div>
        </div>
      </section>

      <div className="ops-actions">
        <div className="page-actions">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="studio-button"
          >
            {saving ? (
              <>
                <Loader2 className="ops-spinner" size={16} aria-hidden="true" />
                Saving changes...
              </>
            ) : (
              <>
                <Save size={16} aria-hidden="true" />
                {isDirty ? "Save changes" : "Saved"}
              </>
            )}
          </button>
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="studio-button-secondary"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Discard changes
            </button>
          )}
        </div>
        <p className="page-small">
          Tip: Press <kbd className="kbd">⌘/Ctrl + Enter</kbd> to save
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <>
            {" "}
            <span className="field-req">*</span>
          </>
        )}
        {optional && (
          <>
            {" "}
            <small>(optional)</small>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p className="field-error">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </div>
  );
}
