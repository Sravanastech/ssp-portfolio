import { Link } from "react-router-dom";

const Logo = () => (
  <Link
    to="/"
    className="inline-flex shrink-0 items-center gap-3"
    aria-label="Sravana S Parimi - Home"
    data-testid="logo-link"
  >
    <img
      src="/images/logo.webp"
      width="56"
      height="56"
      alt="Sravana S Parimi logo"
      className="h-12 w-12 object-contain md:h-14 md:w-14"
      data-testid="logo-image"
      fetchPriority="high"
    />
    <span className="hidden xl:inline font-bold">Sravana S Parimi</span>
  </Link>
);
export default Logo;
