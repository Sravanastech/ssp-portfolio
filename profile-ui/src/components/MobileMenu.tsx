import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth";
import { SiteText } from "@/content/SiteContent";
import { useSiteContent } from "@/content/siteContentContext";
import { useTheme } from "@/theme/theme-context";
import { cv, tint } from "@/theme/cssVars";
import "@/styles/menu.css";
import { trackEvent } from "@/lib/analytics";
import {
  Menu,
  Home,
  Briefcase,
  User,
  Mail,
  FileText,
  LockKeyhole,
  Unlock,
  ShieldCheck,
  LogOut,
  LogIn,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Compass,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";

function MobileMenuClient() {
  const { navigation } = useSiteContent();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { currentTheme, setTheme } = useTheme();
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth();

  const isDark = currentTheme === "midnight";

  const initials =
    (
      (user?.name?.[0] || user?.given_name?.[0] || "") +
      (user?.family_name?.[0] || "")
    ).toUpperCase() || (user?.email?.[0] || "U").toUpperCase();

  const handleSignIn = () => {
    setOpen(false);
    trackEvent("resume_sign_in_click");
    void loginWithRedirect({ appState: { returnTo: "/resume" } });
  };

  const handleLogout = () => {
    setOpen(false);
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const getNavIcon = (path: string) => {
    switch (path) {
      case "/":
        return Home;
      case "/work":
        return Briefcase;
      case "/about":
        return User;
      case "/contact":
        return Mail;
      default:
        return Compass;
    }
  };

  const getNavSubtitle = (path: string) => {
    switch (path) {
      case "/":
        return "Overview & highlights";
      case "/work":
        return "Architecture & systems";
      case "/about":
        return "Engineering background";
      case "/contact":
        return "Let's connect";
      default:
        return "";
    }
  };

  const isResumeActive = location.pathname === "/resume";
  const isAccountActive = location.pathname === "/account";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="studio-menu-trigger transition-all hover:scale-105 active:scale-95"
      >
        <Menu size={23} />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="studio-mobile-sheet flex flex-col justify-between h-[calc(100dvh-4.5rem)] w-[88vw] sm:w-[400px] max-w-md p-5 sm:p-6 overflow-hidden border-l"
        style={{
          backgroundColor: cv.surface,
          borderColor: cv.border,
          color: cv.text,
        }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header & Accessibility Meta */}
          <div
            className="pb-3 border-b pr-8"
            style={{ borderBottomColor: cv.border }}
          >
            <SheetTitle
              className="text-xl font-bold tracking-tight"
              style={{ color: cv.primary }}
            >
              <SiteText id="components.MobileMenu.text.1" />
            </SheetTitle>
            <SheetDescription
              className="text-xs mt-0.5"
              style={{ color: cv.textSecondary }}
            >
              <SiteText id="components.MobileMenu.text.2" />
            </SheetDescription>
          </div>

          {/* User Banner / Prompt */}
          <div className="pt-4 pb-2">
            {isAuthenticated ? (
              <NavLink
                to="/account"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between p-3.5 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xs"
                style={{
                  backgroundColor: cv.background,
                  borderColor: cv.border,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm select-none shrink-0"
                    style={{
                      backgroundColor: tint("primary", 13),
                      color: cv.primary,
                      border: `1.5px solid ${cv.border}`,
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-bold truncate block"
                        style={{ color: cv.text }}
                      >
                        {user?.name || user?.email?.split("@")[0] || "User"}
                      </span>
                      <ShieldCheck
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: cv.success }}
                      />
                    </div>
                    <p
                      className="text-xs truncate font-medium"
                      style={{ color: cv.textSecondary }}
                    >
                      {user?.email}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 transition-transform group-hover:translate-x-1" />
              </NavLink>
            ) : null}
          </div>

          {/* Navigation Links Scrollable Area */}
          <nav
            aria-label="Mobile navigation"
            className="flex-1 overflow-y-auto space-y-2 py-2 pr-1"
          >
            {navigation.map(({ href: path, label }) => {
              const Icon = getNavIcon(path);
              const isActive =
                path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(path);
              return (
                <NavLink
                  end={path === "/"}
                  key={path}
                  to={path}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: isActive
                      ? tint("primary", 8)
                      : cv.background,
                    borderColor: isActive ? cv.primary : cv.border,
                    color: isActive ? cv.primary : cv.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: isActive
                          ? cv.primary
                          : tint("border", 31),
                        color: isActive ? cv.accent : cv.text,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold leading-tight">
                        {label}
                      </div>
                      <div
                        className="text-[11px] font-normal mt-0.5"
                        style={{ color: cv.textSecondary }}
                      >
                        {getNavSubtitle(path)}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                      isActive ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </NavLink>
              );
            })}

            {/* Dynamic Resume NavLink */}
            <NavLink
              to="/resume"
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isResumeActive
                  ? tint("primary", 8)
                  : cv.background,
                borderColor: isResumeActive ? cv.primary : cv.border,
                color: isResumeActive ? cv.primary : cv.text,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: isResumeActive
                      ? cv.primary
                      : isAuthenticated
                        ? tint("success", 13)
                        : tint("border", 31),
                    color: isResumeActive
                      ? cv.accent
                      : isAuthenticated
                        ? cv.success
                        : cv.textSecondary,
                  }}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold leading-tight">
                      <SiteText id="components.MobileMenu.text.3" />
                    </span>
                    {isAuthenticated ? (
                      <span
                        className="px-2 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider"
                        style={{
                          backgroundColor: tint("success", 13),
                          color: cv.success,
                        }}
                      >
                        Unlocked
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wider"
                        style={{
                          backgroundColor: tint("border", 38),
                          color: cv.textSecondary,
                        }}
                      >
                        Protected
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[11px] font-normal mt-0.5"
                    style={{ color: cv.textSecondary }}
                  >
                    {isAuthenticated
                      ? "View executive credentials"
                      : "Sign-in required to view"}
                  </div>
                </div>
              </div>
              {isAuthenticated ? (
                <Unlock
                  className="w-4 h-4 opacity-70"
                  style={{ color: cv.success }}
                />
              ) : (
                <LockKeyhole
                  className="w-4 h-4 opacity-50"
                  style={{ color: cv.textSecondary }}
                />
              )}
            </NavLink>

            {/* Account Settings NavLink when authenticated */}
            {isAuthenticated && (
              <NavLink
                to="/account"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isAccountActive
                    ? tint("primary", 8)
                    : cv.background,
                  borderColor: isAccountActive ? cv.primary : cv.border,
                  color: isAccountActive ? cv.primary : cv.text,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: isAccountActive
                        ? cv.primary
                        : tint("border", 31),
                      color: isAccountActive ? cv.accent : cv.text,
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight">
                      Account Profile
                    </div>
                    <div
                      className="text-[11px] font-normal mt-0.5"
                      style={{ color: cv.textSecondary }}
                    >
                      Manage saved profile & details
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 transition-transform group-hover:translate-x-1" />
              </NavLink>
            )}
          </nav>
        </div>

        {/* Footer & Action Center */}
        <div
          className="pt-4 border-t mt-3 space-y-3 shrink-0"
          style={{ borderTopColor: cv.border }}
        >
          {/* Appearance */}
          <div
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border"
            style={{
              backgroundColor: cv.background,
              borderColor: cv.border,
            }}
          >
            <span
              id="mobile-appearance-label"
              className="text-sm font-bold"
              style={{ color: cv.text }}
            >
              Appearance
            </span>
            <div
              role="group"
              aria-labelledby="mobile-appearance-label"
              className="menu-segmented"
            >
              <button
                type="button"
                aria-pressed={!isDark}
                onClick={() => setTheme("sunrise")}
              >
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                Light
              </button>
              <button
                type="button"
                aria-pressed={isDark}
                onClick={() => setTheme("midnight")}
              >
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                Dark
              </button>
            </div>
          </div>

          {/* Dynamic Sign in / Sign out button */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all hover:bg-red-500/10 active:scale-98"
              style={{
                borderColor: tint("error", 31),
                color: cv.error,
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="studio-button w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition-all active:scale-98"
              style={{
                backgroundColor: cv.primary,
                color: cv.accent,
              }}
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              Sign in to view resume
            </button>
          )}

          <p
            className="text-[11px] text-center opacity-60"
            style={{ color: cv.textSecondary }}
          >
            © 2026 Sravana S Parimi · Engineering Portfolio
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function MobileMenu() {
  const { navigation } = useSiteContent();
  if (typeof window === "undefined") {
    return (
      <Sheet>
        <SheetTrigger
          aria-label="Open navigation menu"
          className="studio-menu-trigger"
        >
          <Menu size={23} />
        </SheetTrigger>
        <SheetContent className="studio-mobile-sheet">
          <SheetTitle className="text-xl font-bold">
            <SiteText id="components.MobileMenu.text.1" />
          </SheetTitle>
          <SheetDescription>
            <SiteText id="components.MobileMenu.text.2" />
          </SheetDescription>
          <nav aria-label="Mobile navigation">
            {navigation.map(({ href: path, label }) => (
              <NavLink end={path === "/"} key={path} to={path}>
                {label}
              </NavLink>
            ))}
            <NavLink to="/resume">
              <SiteText id="components.MobileMenu.text.3" />{" "}
              <LockKeyhole size={18} aria-hidden="true" />
            </NavLink>
          </nav>
          <NavLink className="studio-button" to="/resume">
            Sign in to view resume
          </NavLink>
        </SheetContent>
      </Sheet>
    );
  }
  return <MobileMenuClient />;
}
