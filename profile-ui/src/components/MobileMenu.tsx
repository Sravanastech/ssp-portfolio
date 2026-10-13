import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useSiteContent, SiteText } from "@/content/SiteContent";
import { useTheme } from "@/theme/ThemeContext";
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
  UserPlus,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
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
  const { colors, currentTheme, setTheme } = useTheme();
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();

  const isDark = currentTheme === "ocean";

  const initials =
    (
      (user?.name?.[0] || user?.given_name?.[0] || "") +
      (user?.family_name?.[0] || "")
    ).toUpperCase() || (user?.email?.[0] || "U").toUpperCase();

  const handleSignIn = () => {
    setOpen(false);
    const returnTo =
      location.pathname === "/auth-callback"
        ? "/"
        : location.pathname + location.search;
    void loginWithRedirect({ appState: { returnTo } });
  };

  const handleSignUp = () => {
    setOpen(false);
    const returnTo =
      location.pathname === "/auth-callback"
        ? "/"
        : location.pathname + location.search;
    void loginWithRedirect({
      authorizationParams: { screen_hint: "signup" },
      appState: { returnTo },
    });
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
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header & Accessibility Meta */}
          <div className="pb-3 border-b pr-8" style={{ borderBottomColor: colors.border }}>
            <SheetTitle className="text-xl font-extrabold tracking-tight" style={{ color: colors.primary }}>
              <SiteText id="components.MobileMenu.text.1" />
            </SheetTitle>
            <SheetDescription className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
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
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm select-none shrink-0"
                    style={{
                      backgroundColor: `${colors.primary}20`,
                      color: colors.primary,
                      border: `1.5px solid ${colors.border}`,
                    }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold truncate block" style={{ color: colors.text }}>
                        {user?.name || user?.email?.split("@")[0] || "User"}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: colors.success }} />
                    </div>
                    <p className="text-xs truncate font-medium" style={{ color: colors.textSecondary }}>
                      {user?.email}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50 transition-transform group-hover:translate-x-1" />
              </NavLink>
            ) : (
              <div
                className="p-3.5 rounded-xl border flex items-start gap-3"
                style={{
                  backgroundColor: `${colors.primary}0a`,
                  borderColor: `${colors.primary}25`,
                }}
              >
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: colors.primary }} />
                <div className="text-xs leading-relaxed" style={{ color: colors.textSecondary }}>
                  <span className="font-bold block" style={{ color: colors.primary }}>
                    Full-Stack Portfolio
                  </span>
                  Explore architecture, engineering leadership, and case studies.
                </div>
              </div>
            )}
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
                    backgroundColor: isActive ? `${colors.primary}15` : colors.background,
                    borderColor: isActive ? colors.primary : colors.border,
                    color: isActive ? colors.primary : colors.text,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: isActive ? colors.primary : `${colors.border}50`,
                        color: isActive ? colors.accent : colors.text,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold leading-tight">{label}</div>
                      <div
                        className="text-[11px] font-normal mt-0.5"
                        style={{ color: colors.textSecondary }}
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
                backgroundColor: isResumeActive ? `${colors.primary}15` : colors.background,
                borderColor: isResumeActive ? colors.primary : colors.border,
                color: isResumeActive ? colors.primary : colors.text,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: isResumeActive
                      ? colors.primary
                      : isAuthenticated
                      ? `${colors.success}20`
                      : `${colors.border}50`,
                    color: isResumeActive
                      ? colors.accent
                      : isAuthenticated
                      ? colors.success
                      : colors.textSecondary,
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
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider"
                        style={{
                          backgroundColor: `${colors.success}20`,
                          color: colors.success,
                        }}
                      >
                        Unlocked
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider"
                        style={{
                          backgroundColor: `${colors.border}60`,
                          color: colors.textSecondary,
                        }}
                      >
                        Protected
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[11px] font-normal mt-0.5"
                    style={{ color: colors.textSecondary }}
                  >
                    {isAuthenticated
                      ? "View executive credentials"
                      : "Sign-in required to view"}
                  </div>
                </div>
              </div>
              {isAuthenticated ? (
                <Unlock className="w-4 h-4 opacity-70" style={{ color: colors.success }} />
              ) : (
                <LockKeyhole className="w-4 h-4 opacity-50" style={{ color: colors.textSecondary }} />
              )}
            </NavLink>

            {/* Account Settings NavLink when authenticated */}
            {isAuthenticated && (
              <NavLink
                to="/account"
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: isAccountActive ? `${colors.primary}15` : colors.background,
                  borderColor: isAccountActive ? colors.primary : colors.border,
                  color: isAccountActive ? colors.primary : colors.text,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: isAccountActive ? colors.primary : `${colors.border}50`,
                      color: isAccountActive ? colors.accent : colors.text,
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight">Account Profile</div>
                    <div
                      className="text-[11px] font-normal mt-0.5"
                      style={{ color: colors.textSecondary }}
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
          style={{ borderTopColor: colors.border }}
        >
          {/* Quick Theme Switcher */}
          <div
            className="flex items-center justify-between p-2.5 rounded-xl border"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: colors.text }}>
              {isDark ? (
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>{isDark ? "Dark theme (Ocean)" : "Light theme (Sunrise)"}</span>
            </div>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "sunrise" : "ocean")}
              className="text-xs font-bold px-2.5 py-1 rounded-lg border transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.primary,
              }}
            >
              Toggle
            </button>
          </div>

          {/* Dynamic Sign in / Sign out button */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all hover:bg-red-500/10 active:scale-98"
              style={{
                borderColor: `${colors.error}50`,
                color: colors.error,
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSignIn}
                className="studio-button w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm shadow-xs transition-all hover:scale-102 active:scale-98"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.accent,
                }}
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 active:scale-98"
                style={{
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create account
              </button>
            </div>
          )}

          <p
            className="text-[10px] text-center opacity-60"
            style={{ color: colors.textSecondary }}
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
          <NavLink className="studio-button" to="/account">
            Sign in or create account
          </NavLink>
        </SheetContent>
      </Sheet>
    );
  }
  return <MobileMenuClient />;
}
