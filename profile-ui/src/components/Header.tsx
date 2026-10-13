import { SiteText } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import MainMenu from "./MainMenu";
import MobileMenu from "./MobileMenu";
import ModeToggle from "./ModeToggle";
import AuthDropdown from "./AuthDropdown";

export default function Header() {
  return (
    <header className="studio-header">
      <div className="studio-container studio-header-inner">
        <Link
          to="/"
          className="studio-brand"
          aria-label="Sravana S Parimi - Home"
          data-testid="logo-link"
        >
          <span className="studio-monogram" aria-hidden="true"><SiteText id="components.Header.text.1" /><span><SiteText id="components.Header.text.2" /></span>
          </span>
          <span><SiteText id="components.Header.text.3" /><span className="studio-brand-caption"><SiteText id="components.Header.text.4" /></span>
          </span>
        </Link>
        <div className="studio-desktop-nav">
          <MainMenu />
          <ModeToggle />
          <AuthDropdown />
        </div>
        <div className="studio-mobile-nav">
          <ModeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
