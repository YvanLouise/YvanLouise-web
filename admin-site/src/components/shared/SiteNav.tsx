import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { SiteSettings } from "../../types";

interface SiteNavProps {
  settings: SiteSettings;
}

export function SiteNav({ settings }: SiteNavProps): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = useMemo(() => settings.siteTitle.trim() || "Yvan Louise", [settings.siteTitle]);
  const { nav } = settings.uiText;

  const links = [
    { to: "/", label: nav.home, end: true },
    { to: "/about", label: nav.about },
    { to: "/works", label: nav.works },
    { to: "/commission", label: nav.commission },
    { to: "/support", label: nav.support },
    { to: "/contact", label: nav.contact }
  ];

  return (
    <header className="site-header">
      <div className="nav-inner">
        <NavLink to="/" className="brand" aria-label={nav.backToHomeAria}>
          {title}
        </NavLink>

        <nav className="nav-links" aria-label={nav.mainNavAria}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="mobile-toggle"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav"
          onClick={() => setDrawerOpen((value) => !value)}
        >
          {nav.menu}
        </button>
      </div>

      {drawerOpen ? (
        <nav id="mobile-nav" className="mobile-drawer" aria-label={nav.mobileNavAria}>
          {links.map((link) => (
            <NavLink
              key={`mobile-${link.to}`}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setDrawerOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

