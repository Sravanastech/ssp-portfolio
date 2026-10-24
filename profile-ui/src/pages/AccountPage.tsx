import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/auth";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  accountRequest,
  type Account,
  type AccountProfileUpdate,
} from "@/api/accountApi";
import {
  User,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  Lock,
} from "lucide-react";
import "@/styles/pages.css";

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

export default function AccountPage() {
  const { getAccessTokenSilently, user, logout } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  const loadProfile = useCallback(async () => {
    setInitialLoading(true);
    setStatusMessage(null);
    try {
      const token = await getAccessTokenSilently();
      const provisioned = await accountRequest<Account>(token, "POST", {
        firstName: user?.given_name ?? "",
        lastName: user?.family_name ?? "",
      });
      const current = await accountRequest<Account>(token);
      const active = current ?? provisioned;
      setAccount(active);
      reset(toFormValues(active));
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Your account profile could not be loaded.",
      });
    } finally {
      setInitialLoading(false);
    }
  }, [getAccessTokenSilently, reset, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onSave = async (values: ProfileFormValues) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const token = await getAccessTokenSilently();
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

      const updated = await accountRequest<Account>(token, "PUT", payload);
      setAccount(updated);
      reset(toFormValues(updated));
      setStatusMessage({
        type: "success",
        text: "Your account profile has been saved successfully.",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not save profile changes. Please retry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = () => {
    if (account) {
      reset(toFormValues(account));
    }
    setStatusMessage(null);
  };

  const onDeleteProfile = async () => {
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      await accountRequest(token, "DELETE");
      await logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Could not delete profile.",
      });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit(onSave)(e);
    }
  };

  return (
    <div className="studio-page ops-page">
      <div className="studio-container">
        <div className="ops-column">
          <header className="studio-page-intro">
            <h1 className="studio-page-heading">
              {account
                ? `${account.firstName} ${account.lastName}`.trim() ||
                  "Your Account"
                : "Your Account"}
            </h1>
            <div className="ops-identity">
              <span className="ops-badge ops-badge--ok">
                <ShieldCheck size={14} aria-hidden="true" />
                Verified Identity
              </span>
              {account?.admin && (
                <span className="ops-badge ops-badge--role">Administrator</span>
              )}
              <span className="page-small">{user?.email}</span>
            </div>
            {account?.admin && (
              <div className="studio-actions">
                <Link to="/admin" className="studio-button studio-button--sm">
                  Site Editor
                </Link>
              </div>
            )}
          </header>

          {statusMessage && (
            <div
              role="status"
              className={`page-notice page-notice--${statusMessage.type}`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={20} aria-hidden="true" />
              ) : (
                <AlertCircle size={20} aria-hidden="true" />
              )}
              <div>{statusMessage.text}</div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="link-button"
              >
                Dismiss
              </button>
            </div>
          )}

          {initialLoading ? (
            <p role="status" className="ops-loading">
              <Loader2 className="ops-spinner" size={18} aria-hidden="true" />
              Loading your profile data...
            </p>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit(onSave)}
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
                        value={account?.email ?? user?.email ?? ""}
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
                    <Field
                      id="country"
                      label="Country"
                      error={errors.country?.message}
                    >
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
                        <Loader2
                          className="ops-spinner"
                          size={16}
                          aria-hidden="true"
                        />
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
                      onClick={onDiscard}
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
          )}

          <section
            className="page-panel page-panel--danger ops-danger-zone"
            aria-labelledby="danger-title"
          >
            <div className="ops-danger">
              <div>
                <h2 className="panel-title" id="danger-title">
                  <Trash2 size={20} aria-hidden="true" />
                  Delete Portfolio Profile
                </h2>
                <p className="field-hint">
                  Removes your personal contact and address details stored in
                  the portfolio database. Your sign-in identity with Auth0
                  remains active.
                </p>
              </div>
              {confirmDelete ? (
                <div className="page-actions">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void onDeleteProfile()}
                    className="studio-button studio-button--danger studio-button--sm"
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="studio-button-secondary studio-button--sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(true)}
                  className="studio-button-secondary studio-button--sm"
                >
                  Delete profile data
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
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
