import { SiteText } from "@/content/SiteContent";
import { Link } from "react-router-dom";
import Breadcrumbs from "@/components/Breadcrumbs";
import BackToTop from "@/components/BackToTop";
import { useTheme } from "@/theme/ThemeContext";

export default function PrivacyPage() {
  const { colors } = useTheme();
  return (
    <>
      <Breadcrumbs
        items={[{ label: "Home", path: "/" }, { label: "Privacy Policy" }]}
      />
      <div
        className="p-6 rounded-2xl shadow-md text-justify"
        style={{ backgroundColor: colors.background, color: colors.text }}
      >
        <h1 className="text-3xl font-bold mb-4"><SiteText id="pages.PrivacyPage.text.2" /></h1>

        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.3" /></p>
        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.PrivacyPage.text.4" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.5" /></p>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.6" />{" "}
          <a className="underline" href="https://web3forms.com/privacy"><SiteText id="pages.PrivacyPage.text.7" /></a><SiteText id="pages.PrivacyPage.text.8" /></p>
        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.PrivacyPage.text.9" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.10" /></p>
        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.PrivacyPage.text.11" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.12" /></p>
        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.PrivacyPage.text.13" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.14" /></p>
        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.PrivacyPage.text.15" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.16" /></p>
        <h2 className="text-2xl font-semibold mb-2"><SiteText id="pages.PrivacyPage.text.17" /></h2>
        <p className="text-lg mb-4"><SiteText id="pages.PrivacyPage.text.18" /></p>
        <p className="text-lg mt-6"><SiteText id="pages.PrivacyPage.text.19" />{" "}
          <Link to="/contact" className="underline"><SiteText id="pages.PrivacyPage.text.20" /></Link><SiteText id="pages.PrivacyPage.text.21" /></p>
      </div>
      <BackToTop />
    </>
  );
}
