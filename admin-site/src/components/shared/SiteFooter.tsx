import { SiteSettings } from "../../types";

interface SiteFooterProps {
  settings?: SiteSettings;
}

export function SiteFooter({ settings }: SiteFooterProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const footerText = settings?.uiText.footer;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="stack" style={{ gap: "0.35rem" }}>
          <span>
            {settings?.siteTitle ?? "Yvan Louise"} · {currentYear}
          </span>
          <span className="meta">{footerText?.copyrightPrefix ?? "保留所有作品与展示权利"}</span>
          {settings?.afdianUrl ? (
            <a href={settings.afdianUrl} target="_blank" rel="noreferrer" className="nav-link">
              {footerText?.afdianLabel ?? "爱发电"}
            </a>
          ) : null}
          {settings?.afdianUrl ? <span className="meta">{footerText?.afdianHint ?? "如果你愿意，也可以在爱发电支持我的持续创作。"}</span> : null}
        </div>
        <div className="row" aria-label="Social links">
          {(settings?.socialLinks ?? []).map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="nav-link">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
