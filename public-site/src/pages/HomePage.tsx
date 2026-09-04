import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { WorkCard } from "@shared/components/shared/WorkCard";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";
import { getSamplePage } from "@shared/data/sampleData";
import { getPage, getWorks } from "@shared/lib/api";
import { resolveFeaturedWorks } from "@shared/lib/featuredWorks";
import { readCachedPage, readCachedWorks } from "@shared/lib/siteCache";
import { resolveMediaUrl } from "@shared/lib/workMedia";
import { PageContent, Work } from "@shared/types";

export function HomePage(): JSX.Element {
  const settings = useSiteSettings();
  const [homeContent, setHomeContent] = useState<PageContent>(() => readCachedPage("home") ?? getSamplePage("home"));
  const [allWorks, setAllWorks] = useState<Work[]>(() => readCachedWorks() ?? []);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    void getPage("home").then(setHomeContent).catch(() => undefined);
    void getWorks().then(setAllWorks).catch(() => undefined);
  }, []);

  useEffect(() => {
    setBannerFailed(false);
  }, [settings.bannerImageUrl]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [settings.avatarImageUrl]);

  const featured = useMemo(() => resolveFeaturedWorks(allWorks, settings.featuredWorkIds), [allWorks, settings.featuredWorkIds]);
  const uiText = settings.uiText.home;
  const bannerImageUrl = resolveMediaUrl(settings.bannerImageUrl);
  const avatarImageUrl = resolveMediaUrl(settings.avatarImageUrl);
  const showBannerImage = Boolean(bannerImageUrl) && !bannerFailed;
  const showAvatarImage = Boolean(avatarImageUrl) && !avatarFailed;

  return (
    <>
      <section className="hero-banner panel">
        {showBannerImage ? (
          <img className="hero-banner-media" src={bannerImageUrl} alt="首页横幅图" decoding="async" onError={() => setBannerFailed(true)} />
        ) : (
          <div className="hero-banner-media hero-banner-placeholder" aria-hidden="true" />
        )}
        <div className="hero-banner-overlay" aria-hidden="true" />

        <div className="stack hero-banner-copy">
          <span className="badge">{settings.bannerBadge}</span>
          <strong className="hero-banner-title">{settings.bannerHeadline}</strong>
          <p className="meta hero-banner-description">{settings.bannerDescription}</p>
        </div>

        <div className="cta-row hero-banner-actions">
          <Link to="/support" className="btn btn-primary">{uiText.bannerPrimaryLabel}</Link>
          <Link to="/works" className="btn btn-secondary">{uiText.bannerSecondaryLabel}</Link>
        </div>
      </section>

      <section className="hero hero-split compact-mobile-hero">
        <div className="stack hero-main">
          <motion.span className="badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
            {settings.tagline}
          </motion.span>
          <h1>{homeContent.title}</h1>
          <p>{homeContent.hero}</p>

          <div className="cta-row">
            <Link to={settings.primaryCtaHref} className="btn btn-primary">{settings.primaryCtaLabel}</Link>
            <Link to={settings.secondaryCtaHref} className="btn btn-secondary">{settings.secondaryCtaLabel}</Link>
          </div>
        </div>

        <aside className="profile-card panel compact-profile-card">
          <div className="profile-banner-surface">
            {showBannerImage ? (
              <img className="profile-banner-image" src={bannerImageUrl} alt="个人名片横幅图" loading="lazy" decoding="async" onError={() => setBannerFailed(true)} />
            ) : (
              <div className="editable-image-placeholder" aria-hidden="true" />
            )}
            <span className="badge profile-banner-badge">{uiText.profileBadge}</span>
          </div>

          <div className={`profile-avatar ${showAvatarImage ? "profile-avatar-has-image" : ""}`}>
            {showAvatarImage ? (
              <img className="profile-avatar-image" src={avatarImageUrl} alt={`${settings.siteTitle} 的头像`} decoding="async" onError={() => setAvatarFailed(true)} />
            ) : (
              <span className="profile-avatar-fallback" aria-hidden="true" />
            )}
          </div>

          <div className="stack compact-stack-gap">
            <strong className="profile-name">{settings.siteTitle}</strong>
            <p className="meta" style={{ margin: 0 }}>{uiText.profileDescription}</p>
            <div className="profile-stat-row">
              <span>{uiText.profileStatOne}</span>
              <span>{uiText.profileStatTwo}</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="row section-header-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="stack compact-stack-gap">
            <h2 style={{ marginBottom: 0 }}>{uiText.featuredTitle}</h2>
            <p className="meta" style={{ margin: 0 }}>{uiText.featuredDescription}</p>
          </div>
          <Link to="/works" className="btn btn-secondary">{uiText.featuredBrowseLabel}</Link>
        </div>

        <div className="card-grid compact-card-grid" style={{ marginTop: "1rem" }}>
          {featured.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      </section>

      <section className="section panel stack compact-panel-stack">
        <div className="row section-header-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{uiText.supportTitle}</h2>
          <Link to="/support" className="btn btn-secondary">前往支持页</Link>
        </div>

        <p style={{ margin: 0 }}>{homeContent.body}</p>

        <div className="cta-row">
          <Link to="/commission" className="btn btn-primary">{uiText.supportPrimaryLabel}</Link>
          <Link to="/contact" className="btn btn-secondary">查看联系入口</Link>
        </div>
      </section>
    </>
  );
}
