import { SiteText } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import BackToTop from "@/components/BackToTop";
import { useTheme } from "@/theme/ThemeContext";

export default function TermsAndConditionsPage() {
  const { colors } = useTheme();
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Home", path: "/" },
          { label: "Terms and Conditions" },
        ]}
      />
      <div
        className="p-6 rounded-2xl shadow-md text-justify"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <h1 className="text-3xl font-bold mb-4"><SiteText id="pages.TermsAndConditions.text.2" /></h1>

        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.3" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.4" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.5" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.6" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.7" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.8" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.9" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.10" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.11" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.12" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.13" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.14" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.15" /></p>

        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.TermsAndConditions.text.16" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.TermsAndConditions.text.17" /></p>

        <p className="text-lg mt-6"><SiteText id="pages.TermsAndConditions.text.18" />{" "}
          <Link to="/contact" className="underline"><SiteText id="pages.TermsAndConditions.text.19" /></Link><SiteText id="pages.TermsAndConditions.text.20" /></p>
      </div>
      <BackToTop />
    </>
  );
}
