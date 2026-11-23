import { useState, useRef, useEffect } from "react";
import { currentReturnPath } from "@/auth/returnTo";
import { useAuth } from "@/auth/auth";
import { useLocation, useNavigate } from "react-router-dom";
import { cv } from "@/theme/cssVars";
import "@/styles/menu.css";
import { trackEvent } from "@/lib/analytics";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { CircleUser, LogOut } from "lucide-react";

const AuthDropdownClient = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  if (!isAuthenticated) {
    const returnTo = currentReturnPath(location);
    return (
      <button
        type="button"
        className="auth-ghost-button"
        onClick={() => {
          trackEvent("resume_sign_in_click");
          void loginWithRedirect({ appState: { returnTo } });
        }}
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        className="auth-ghost-button auth-ghost-icon"
        aria-label="User account menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        {...dropdownHandler}
      >
        <CircleUser className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-50 animate-fade-in depth-shadow overflow-hidden"
          style={{
            backgroundColor: cv.surface,
            borderColor: cv.border,
            border: `2px solid ${cv.border}`,
          }}
          role="menu"
          aria-label="Account options"
          onKeyDown={handleKeyDown}
        >
          {
            <>
              {/* User Info */}
              <div
                className="px-4 py-4 border-b"
                style={{ borderBottomColor: cv.border }}
              >
                <p style={{ color: cv.textSecondary }} className="text-sm">
                  Signed in as
                </p>
                <p className="font-bold truncate" style={{ color: cv.primary }}>
                  {user?.email}
                </p>
              </div>

              <button
                ref={(el) => {
                  menuItemsRef.current[0] = el;
                }}
                onClick={() => {
                  navigate("/account");
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left font-medium focus:outline-none focus:ring-2"
                style={{ color: cv.text }}
                role="menuitem"
              >
                Account
              </button>

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
                style={{ color: cv.error, borderTopColor: cv.border }}
                role="menuitem"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </>
          }
        </div>
      )}
    </div>
  );
};

const AuthDropdown = () =>
  typeof window === "undefined" ? (
    <span aria-hidden="true" className="studio-account-slot" />
  ) : (
    <AuthDropdownClient />
  );

export default AuthDropdown;
