import { useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SiteSettings } from "@shared/types";

interface PublicSiteNavProps {
  settings: SiteSettings;
}

export function PublicSiteNav({ settings }: PublicSiteNavProps): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => setDrawerOpen(false), [location.key]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") { setDrawerOpen(false); toggleRef.current?.focus(); }
    };
    const onOutside = (event: PointerEvent): void => {
      if (!headerRef.current?.contains(event.target as Node)) setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onOutside); };
  }, [drawerOpen]);
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
    <header className="site-header" ref={headerRef}>
      <div className="nav-inner">
        <NavLink to="/" className="brand" aria-label={nav.backToHomeAria}>
          {title}
        </NavLink>

        <nav className="nav-links" aria-label={nav.mainNavAria}>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="mobile-toggle"
          ref={toggleRef}
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
