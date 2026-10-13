import { useSiteContent } from "@/content/SiteContent";
import { SiteText } from "@/content/SiteContent";
import { NavLink } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";

function MainMenuClient() {
  const { navigation } = useSiteContent();
  const { isAuthenticated } = useAuth0();
  return (
    <nav className="studio-navigation" aria-label="Main navigation">
      {navigation.map(({ href: path, label }) => (
        <NavLink key={path} to={path} end={path === "/"}>
          {label}
        </NavLink>
      ))}
      <NavLink
        to="/resume"
        title={isAuthenticated ? "View Resume" : "Resume (sign-in required)"}
      >
        <SiteText id="components.MainMenu.text.1" />{" "}
        {!isAuthenticated && <LockKeyhole size={13} aria-hidden="true" />}
      </NavLink>
    </nav>
  );
}

export default function MainMenu() {
  const { navigation } = useSiteContent();
  if (typeof window === "undefined") {
    return (
      <nav className="studio-navigation" aria-label="Main navigation">
        {navigation.map(({ href: path, label }) => (
          <NavLink key={path} to={path} end={path === "/"}>
            {label}
          </NavLink>
        ))}
        <NavLink to="/resume" title="Resume (sign-in required)">
          <SiteText id="components.MainMenu.text.1" />{" "}
          <LockKeyhole size={13} aria-hidden="true" />
        </NavLink>
      </nav>
    );
  }
  return <MainMenuClient />;
}
