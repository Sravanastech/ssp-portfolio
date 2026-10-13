import { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/theme/ThemeContext";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import {
  UserCircleIcon,
  ArrowLeftStartOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
} from "@heroicons/react/24/solid";

const AuthDropdownClient = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const dropdownHandler = useKeyboardNav(buttonRef, {
    onClick: () => setIsOpen(!isOpen),
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const itemCount = menuItemsRef.current.filter(
      (item) => item !== null,
    ).length;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % itemCount);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        menuItemsRef.current[focusedIndex]?.click();
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (isOpen && menuItemsRef.current[focusedIndex]) {
      menuItemsRef.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        className="p-2.5 rounded-lg transition-all hover:scale-110 active:scale-95 focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: isOpen ? `${colors.primary}20` : "transparent",
          color: colors.primary,
          border: `2px solid ${colors.border}`,
        }}
        aria-label="User account menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        {...dropdownHandler}
      >
        <UserCircleIcon className="w-6 h-6" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-50 animate-fade-in depth-shadow overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            border: `2px solid ${colors.border}`,
          }}
          role="menu"
          aria-label="Account options"
          onKeyDown={handleKeyDown}
        >
          {isAuthenticated ? (
            <>
              {/* User Info */}
              <div
                className="px-4 py-4 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <p style={{ color: colors.textSecondary }} className="text-sm">
                  Signed in as
                </p>
                <p
                  className="font-bold truncate"
                  style={{ color: colors.primary }}
                >
                  {user?.email}
                </p>
              </div>

              <button
                ref={(el) => { menuItemsRef.current[0] = el; }}
                onClick={() => { navigate("/account"); setIsOpen(false); }}
                className="w-full px-4 py-3 text-left font-semibold focus:outline-none focus:ring-2"
                style={{ color: colors.text }}
                role="menuitem"
              >Account</button>

              {/* Menu Items */}
              <button
                ref={(el) => {
                  menuItemsRef.current[1] = el;
                }}
                onClick={() => {
                  logout({
                    logoutParams: { returnTo: window.location.origin },
                  });
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 transition-all hover:opacity-75 border-t focus:outline-none focus:ring-2"
                style={{ color: colors.error, borderTopColor: colors.border }}
                role="menuitem"
              >
                <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
                <span className="font-semibold">Logout</span>
              </button>
            </>
          ) : (
            <>
              {(() => {
                const currentPath = location.pathname + location.search + location.hash;
                const returnTo = currentPath === "/auth-callback" ? "/" : currentPath;
                return (
                  <>
                    <button ref={(el) => { menuItemsRef.current[0] = el; }} onClick={() => { void loginWithRedirect({ appState: { returnTo } }); setIsOpen(false); }} className="w-full px-4 py-3 flex items-center gap-3 font-semibold focus:outline-none focus:ring-2" style={{ color: colors.primary }} role="menuitem"><ArrowLeftStartOnRectangleIcon className="w-5 h-5" />Sign in</button>
                    <button ref={(el) => { menuItemsRef.current[1] = el; }} onClick={() => { void loginWithRedirect({ authorizationParams: { screen_hint: "signup" }, appState: { returnTo } }); setIsOpen(false); }} className="w-full px-4 py-3 text-left font-semibold focus:outline-none focus:ring-2" style={{ color: colors.text }} role="menuitem">Create account</button>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const AuthDropdown = () =>
  typeof window === "undefined" ? <span aria-hidden="true" className="studio-account-slot" /> : <AuthDropdownClient />;

export default AuthDropdown;
