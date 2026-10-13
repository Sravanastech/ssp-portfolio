import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  accountRequest,
  type Account,
  type AccountProfileUpdate,
} from "@/api/accountApi";
import { useTheme } from "@/theme/ThemeContext";
import {
  User,
  Mail,
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
  city: z
    .string()
    .trim()
    .max(80, "City cannot exceed 80 characters."),
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
  country: z
    .string()
    .trim()
    .max(80, "Country cannot exceed 80 characters."),
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
  const { getAccessTokenSilently, user, logout } = useAuth0();
  const { colors } = useTheme();

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

  const initials =
    (
      (account?.firstName?.[0] || user?.given_name?.[0] || "") +
      (account?.lastName?.[0] || user?.family_name?.[0] || "")
    ).toUpperCase() || (user?.email?.[0] || "U").toUpperCase();

  const inputStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    color: colors.text,
  };

  return (
    <main className="studio-container studio-page max-w-4xl py-8">
      {/* Header & Identity Card */}
      <div
        className="rounded-2xl border p-6 md:p-8 mb-8 shadow-xs"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner select-none"
              style={{
                backgroundColor: `${colors.primary}20`,
                color: colors.primary,
                border: `2px solid ${colors.border}`,
              }}
            >
              {initials}
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-extrabold tracking-tight"
                style={{ color: colors.primary }}
              >
                {account
                  ? `${account.firstName} ${account.lastName}`.trim() ||
                    "Your Account"
                  : "Your Account"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${colors.success}18`,
                    color: colors.success,
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Identity
                </span>
                {account?.admin && (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${colors.primary}18`,
                      color: colors.primary,
                    }}
                  >
                    Administrator
                  </span>
                )}
                <span
                  className="text-sm font-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          {account?.admin && (
            <Link
              to="/admin"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-xs"
              style={{
                backgroundColor: colors.primary,
                color: colors.accent,
              }}
            >
              Site Editor
            </Link>
          )}
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          role="status"
          className="mb-8 p-4 rounded-xl border flex items-start gap-3 animate-fade-in shadow-xs"
          style={{
            backgroundColor:
              statusMessage.type === "success"
                ? `${colors.success}15`
                : `${colors.error}15`,
            borderColor:
              statusMessage.type === "success"
                ? colors.success
                : colors.error,
            color:
              statusMessage.type === "success"
                ? colors.success
                : colors.error,
          }}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">
            {statusMessage.text}
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {initialLoading ? (
        <div
          className="rounded-2xl border p-12 text-center shadow-xs"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
        >
          <Loader2
            className="w-8 h-8 animate-spin mx-auto mb-4"
            style={{ color: colors.primary }}
          />
          <p
            className="text-sm font-medium"
            style={{ color: colors.textSecondary }}
          >
            Loading your profile data...
          </p>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={handleSubmit(onSave)}
          onKeyDown={handleKeyDown}
          aria-busy={saving}
          className="space-y-8"
        >
          {/* Section 1: Personal Details */}
          <div
            className="rounded-2xl border p-6 md:p-8 shadow-xs"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5" style={{ color: colors.primary }} />
              <h2
                className="text-xl font-bold"
                style={{ color: colors.primary }}
              >
                Personal Details
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  First name <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  id="firstName"
                  {...register("firstName")}
                  autoComplete="given-name"
                  placeholder="Jane"
                  maxLength={80}
                  className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={inputStyle}
                  aria-invalid={errors.firstName ? "true" : "false"}
                />
                {errors.firstName && (
                  <p
                    className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                    style={{ color: colors.error }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  Last name <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  id="lastName"
                  {...register("lastName")}
                  autoComplete="family-name"
                  placeholder="Doe"
                  maxLength={80}
                  className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={inputStyle}
                  aria-invalid={errors.lastName ? "true" : "false"}
                />
                {errors.lastName && (
                  <p
                    className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                    style={{ color: colors.error }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div
            className="rounded-2xl border p-6 md:p-8 shadow-xs"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Phone className="w-5 h-5" style={{ color: colors.primary }} />
              <h2
                className="text-xl font-bold"
                style={{ color: colors.primary }}
              >
                Contact Details
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  autoComplete="tel"
                  placeholder="+1 (555) 123-4567"
                  maxLength={32}
                  className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={inputStyle}
                  aria-invalid={errors.phone ? "true" : "false"}
                />
                {errors.phone ? (
                  <p
                    className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                    style={{ color: colors.error }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.phone.message}
                  </p>
                ) : (
                  <p
                    className="mt-1.5 text-xs"
                    style={{ color: colors.textSecondary }}
                  >
                    Optional. Used for direct contact inquiries.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="verifiedEmail"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  Sign-in email
                </label>
                <div className="relative">
                  <input
                    id="verifiedEmail"
                    type="email"
                    value={account?.email ?? user?.email ?? ""}
                    readOnly
                    disabled
                    className="w-full rounded-xl border p-3 pr-10 text-sm opacity-70 cursor-not-allowed"
                    style={inputStyle}
                  />
                  <Lock
                    className="w-4 h-4 absolute right-3.5 top-3.5"
                    style={{ color: colors.textSecondary }}
                  />
                </div>
                <p
                  className="mt-1.5 text-xs flex items-center gap-1"
                  style={{ color: colors.textSecondary }}
                >
                  <Mail className="w-3 h-3" />
                  Verified through Auth0 identity provider (read-only).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Location / Mailing Address */}
          <div
            className="rounded-2xl border p-6 md:p-8 shadow-xs"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5" style={{ color: colors.primary }} />
              <h2
                className="text-xl font-bold"
                style={{ color: colors.primary }}
              >
                Mailing Address
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="addressLine1"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  Street address
                </label>
                <input
                  id="addressLine1"
                  {...register("addressLine1")}
                  autoComplete="address-line1"
                  placeholder="123 Innovation Way"
                  maxLength={120}
                  className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={inputStyle}
                  aria-invalid={errors.addressLine1 ? "true" : "false"}
                />
                {errors.addressLine1 && (
                  <p
                    className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                    style={{ color: colors.error }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.addressLine1.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="addressLine2"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  Apartment, suite, unit{" "}
                  <span
                    className="font-normal"
                    style={{ color: colors.textSecondary }}
                  >
                    (optional)
                  </span>
                </label>
                <input
                  id="addressLine2"
                  {...register("addressLine2")}
                  autoComplete="address-line2"
                  placeholder="Suite 400"
                  maxLength={120}
                  className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={inputStyle}
                  aria-invalid={errors.addressLine2 ? "true" : "false"}
                />
                {errors.addressLine2 && (
                  <p
                    className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                    style={{ color: colors.error }}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.addressLine2.message}
                  </p>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="city"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: colors.text }}
                  >
                    City
                  </label>
                  <input
                    id="city"
                    {...register("city")}
                    autoComplete="address-level2"
                    placeholder="Cincinnati"
                    maxLength={80}
                    className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={inputStyle}
                    aria-invalid={errors.city ? "true" : "false"}
                  />
                  {errors.city && (
                    <p
                      className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                      style={{ color: colors.error }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="region"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: colors.text }}
                  >
                    State / Province / Region
                  </label>
                  <input
                    id="region"
                    {...register("region")}
                    autoComplete="address-level1"
                    placeholder="OH"
                    maxLength={80}
                    className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={inputStyle}
                    aria-invalid={errors.region ? "true" : "false"}
                  />
                  {errors.region && (
                    <p
                      className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                      style={{ color: colors.error }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.region.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="postalCode"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: colors.text }}
                  >
                    Postal / ZIP code
                  </label>
                  <input
                    id="postalCode"
                    {...register("postalCode")}
                    autoComplete="postal-code"
                    placeholder="45202"
                    maxLength={20}
                    className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={inputStyle}
                    aria-invalid={errors.postalCode ? "true" : "false"}
                  />
                  {errors.postalCode && (
                    <p
                      className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                      style={{ color: colors.error }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.postalCode.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="country"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: colors.text }}
                  >
                    Country
                  </label>
                  <input
                    id="country"
                    list="country-suggestions"
                    {...register("country")}
                    autoComplete="country-name"
                    placeholder="United States"
                    maxLength={80}
                    className="w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={inputStyle}
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
                  {errors.country && (
                    <p
                      className="mt-1.5 text-xs flex items-center gap-1 font-medium"
                      style={{ color: colors.error }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div
            className="rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="studio-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-xs"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.accent,
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isDirty ? "Save changes" : "Saved"}
                  </>
                )}
              </button>

              {isDirty && (
                <button
                  type="button"
                  onClick={onDiscard}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:opacity-80 active:scale-95"
                  style={{
                    borderColor: colors.border,
                    color: colors.textSecondary,
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Discard changes
                </button>
              )}
            </div>

            <p
              className="text-xs"
              style={{ color: colors.textSecondary }}
            >
              Tip: Press <kbd className="px-1.5 py-0.5 rounded border text-[11px]">⌘/Ctrl + Enter</kbd> to save
            </p>
          </div>
        </form>
      )}

      {/* Danger Zone */}
      <div
        className="mt-12 rounded-2xl border p-6 md:p-8 shadow-xs"
        style={{
          backgroundColor: colors.surface,
          borderColor: `${colors.error}40`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: colors.error }}
            >
              <Trash2 className="w-5 h-5" />
              Delete Portfolio Profile
            </h2>
            <p
              className="text-sm mt-1 max-w-xl leading-relaxed"
              style={{ color: colors.textSecondary }}
            >
              Removes your personal contact and address details stored in the
              portfolio database. Your sign-in identity with Auth0 remains active.
            </p>
          </div>

          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void onDeleteProfile()}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-xs"
                  style={{
                    backgroundColor: colors.error,
                    color: "#ffffff",
                  }}
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl text-sm border font-semibold"
                  style={{
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-red-500/10 active:scale-95"
                style={{
                  borderColor: `${colors.error}60`,
                  color: colors.error,
                }}
              >
                Delete profile data
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
