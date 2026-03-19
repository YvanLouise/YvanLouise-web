import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { EditableImage } from "../components/admin/EditableImage";
import { InlineEditableText } from "../components/admin/InlineEditable";
import { WorkCard } from "../components/shared/WorkCard";
import { getSamplePage, sampleSettings } from "../data/sampleData";
import { getPage, getSiteSettings, getWorks } from "../lib/api";
import { PageContent, SiteSettings, Work } from "../types";
import { resolveFeaturedWorks } from "@shared/lib/featuredWorks";

const EMPTY_SITE_SETTINGS: SiteSettings = {
  ...sampleSettings,
  bannerImageUrl: "",
  avatarImageUrl: ""
};

interface HomePageProps {
  mode?: "view" | "edit";
  contentOverride?: PageContent;
  settingsOverride?: SiteSettings;
  worksOverride?: Work[];
  onContentChange?: (patch: Partial<PageContent>) => void;
  onSettingsChange?: (patch: Partial<SiteSettings>) => void;
  onSettingsImageUpload?: (field: "bannerImageUrl" | "avatarImageUrl", url: string) => Promise<void> | void;
}

export function HomePage({
  mode = "view",
  contentOverride,
  settingsOverride,
  worksOverride,
  onContentChange,
  onSettingsChange,
  onSettingsImageUpload
}: HomePageProps): JSX.Element {
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SITE_SETTINGS);
  const [homeContent, setHomeContent] = useState<PageContent>(getSamplePage("home"));
  const [works, setWorks] = useState<Work[]>([]);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (!contentOverride) {
      void getPage("home").then(setHomeContent).catch(() => undefined);
    }
  }, [contentOverride]);

  useEffect(() => {
    if (!settingsOverride) {
      void getSiteSettings().then(setSettings).catch(() => undefined);
    }
  }, [settingsOverride]);

  useEffect(() => {
    if (!worksOverride) {
      void getWorks().then(setWorks).catch(() => undefined);
    }
  }, [worksOverride]);

  useEffect(() => {
    setBannerFailed(false);
  }, [settingsOverride?.bannerImageUrl, settings.bannerImageUrl]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [settingsOverride?.avatarImageUrl, settings.avatarImageUrl]);

  const editMode = mode === "edit";
  const currentContent = contentOverride ?? homeContent;
  const currentSettings = settingsOverride ?? settings;
  const currentWorks = worksOverride ?? resolveFeaturedWorks(works, currentSettings.featuredWorkIds);
  const uiText = currentSettings.uiText.home;
  const showBannerImage = Boolean(currentSettings.bannerImageUrl) && !bannerFailed;
  const showAvatarImage = Boolean(currentSettings.avatarImageUrl) && !avatarFailed;

  async function handleSettingsImageUpload(field: "bannerImageUrl" | "avatarImageUrl", url: string): Promise<void> {
    if (onSettingsImageUpload) {
      await onSettingsImageUpload(field, url);
      return;
    }

    onSettingsChange?.({ [field]: url } as Partial<SiteSettings>);
  }

  return (
    <>
      <section className="hero-banner panel">
        <EditableImage enabled={editMode} label="首页横幅图" slot="site-banner" onUploaded={(url) => handleSettingsImageUpload("bannerImageUrl", url)}>
          {(bindProps) =>
            showBannerImage ? (
              <img
                className="hero-banner-media"
                src={currentSettings.bannerImageUrl}
                alt="首页横幅图"
                onError={() => setBannerFailed(true)}
                onContextMenu={bindProps.onContextMenu}
                title={bindProps.title}
              />
            ) : (
              <div
                className="hero-banner-media hero-banner-placeholder"
                onContextMenu={bindProps.onContextMenu}
                title={bindProps.title}
                aria-hidden="true"
              />
            )
          }
        </EditableImage>
        <div className="hero-banner-overlay" aria-hidden="true" />

        <div className="stack hero-banner-copy">
          {editMode ? (
            <InlineEditableText label="横幅标签" value={currentSettings.bannerBadge} onChange={(value) => onSettingsChange?.({ bannerBadge: value })} compact />
          ) : (
            <span className="badge">{currentSettings.bannerBadge}</span>
          )}

          {editMode ? (
            <InlineEditableText label="横幅标题" value={currentSettings.bannerHeadline} onChange={(value) => onSettingsChange?.({ bannerHeadline: value })} multiline rows={3} />
          ) : (
            <strong className="hero-banner-title">{currentSettings.bannerHeadline}</strong>
          )}

          {editMode ? (
            <InlineEditableText label="横幅说明" value={currentSettings.bannerDescription} onChange={(value) => onSettingsChange?.({ bannerDescription: value })} multiline rows={3} />
          ) : (
            <p className="meta hero-banner-description">{currentSettings.bannerDescription}</p>
          )}
        </div>

        <div className="cta-row hero-banner-actions">
          {editMode ? (
            <>
              <button type="button" className="btn btn-primary btn-static-preview">{uiText.bannerPrimaryLabel}</button>
              <button type="button" className="btn btn-secondary btn-static-preview">{uiText.bannerSecondaryLabel}</button>
            </>
          ) : (
            <>
              <Link to="/support" className="btn btn-primary">{uiText.bannerPrimaryLabel}</Link>
              <Link to="/works" className="btn btn-secondary">{uiText.bannerSecondaryLabel}</Link>
            </>
          )}
        </div>
      </section>

      <section className="hero hero-split compact-mobile-hero">
        <div className="stack hero-main">
          {editMode ? (
            <InlineEditableText label="首页标签" value={currentSettings.tagline} onChange={(value) => onSettingsChange?.({ tagline: value })} compact />
          ) : (
            <motion.span className="badge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
              {currentSettings.tagline}
            </motion.span>
          )}

          {editMode ? (
            <InlineEditableText label="首页标题" value={currentContent.title} onChange={(value) => onContentChange?.({ title: value })} multiline rows={2} />
          ) : (
            <h1>{currentContent.title}</h1>
          )}

          {editMode ? (
            <InlineEditableText label="首页导语" value={currentContent.hero} onChange={(value) => onContentChange?.({ hero: value })} multiline rows={3} />
          ) : (
            <p>{currentContent.hero}</p>
          )}

          <div className="cta-row">
            {editMode ? (
              <>
                <button type="button" className="btn btn-primary btn-static-preview">{currentSettings.primaryCtaLabel}</button>
                <button type="button" className="btn btn-secondary btn-static-preview">{currentSettings.secondaryCtaLabel}</button>
              </>
            ) : (
              <>
                <Link to={currentSettings.primaryCtaHref} className="btn btn-primary">{currentSettings.primaryCtaLabel}</Link>
                <Link to={currentSettings.secondaryCtaHref} className="btn btn-secondary">{currentSettings.secondaryCtaLabel}</Link>
              </>
            )}
          </div>

          {editMode ? (
            <div className="inline-cta-grid">
              <InlineEditableText label="主按钮文案" value={currentSettings.primaryCtaLabel} onChange={(value) => onSettingsChange?.({ primaryCtaLabel: value })} compact />
              <InlineEditableText label="主按钮链接" value={currentSettings.primaryCtaHref} onChange={(value) => onSettingsChange?.({ primaryCtaHref: value })} compact />
              <InlineEditableText label="次按钮文案" value={currentSettings.secondaryCtaLabel} onChange={(value) => onSettingsChange?.({ secondaryCtaLabel: value })} compact />
              <InlineEditableText label="次按钮链接" value={currentSettings.secondaryCtaHref} onChange={(value) => onSettingsChange?.({ secondaryCtaHref: value })} compact />
            </div>
          ) : null}
        </div>

        <aside className="profile-card panel compact-profile-card">
          <EditableImage enabled={editMode} label="名片横幅图" slot="site-banner" onUploaded={(url) => handleSettingsImageUpload("bannerImageUrl", url)}>
            {(bindProps) => (
              <div className="profile-banner-surface" onContextMenu={bindProps.onContextMenu} title={bindProps.title}>
                {showBannerImage ? (
                  <img className="profile-banner-image" src={currentSettings.bannerImageUrl} alt="个人名片横幅图" onError={() => setBannerFailed(true)} />
                ) : (
                  <div className="editable-image-placeholder" aria-hidden="true" />
                )}
                <span className="badge profile-banner-badge">{uiText.profileBadge}</span>
              </div>
            )}
          </EditableImage>

          <EditableImage enabled={editMode} label="头像图" slot="site-avatar" onUploaded={(url) => handleSettingsImageUpload("avatarImageUrl", url)}>
            {(bindProps) => (
              <div className={`profile-avatar ${showAvatarImage ? "profile-avatar-has-image" : ""}`} onContextMenu={bindProps.onContextMenu} title={bindProps.title}>
                {showAvatarImage ? (
                  <img className="profile-avatar-image" src={currentSettings.avatarImageUrl} alt={`${currentSettings.siteTitle} 的头像`} onError={() => setAvatarFailed(true)} />
                ) : (
                  <span className="profile-avatar-fallback" aria-hidden="true" />
                )}
              </div>
            )}
          </EditableImage>

          <div className="stack compact-stack-gap">
            <strong className="profile-name">{currentSettings.siteTitle}</strong>
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
          {editMode ? (
            <span className="meta">作品封面可以在“作品管理”里右键替换，也能指定哪些作品进入首页精选。</span>
          ) : (
            <Link to="/works" className="btn btn-secondary">{uiText.featuredBrowseLabel}</Link>
          )}
        </div>

        <div className="card-grid compact-card-grid" style={{ marginTop: "1rem" }}>
          {currentWorks.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      </section>

      <section className="section panel stack compact-panel-stack">
        <div className="row section-header-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{uiText.supportTitle}</h2>
          {editMode ? (
            <button type="button" className="btn btn-secondary btn-static-preview">前往支持页</button>
          ) : (
            <Link to="/support" className="btn btn-secondary">前往支持页</Link>
          )}
        </div>

        {editMode ? (
          <InlineEditableText label="首页说明" value={currentContent.body} onChange={(value) => onContentChange?.({ body: value })} multiline rows={4} />
        ) : (
          <p style={{ margin: 0 }}>{currentContent.body}</p>
        )}

        <div className="cta-row">
          {editMode ? (
            <>
              <button type="button" className="btn btn-primary btn-static-preview">{uiText.supportPrimaryLabel}</button>
              <button type="button" className="btn btn-secondary btn-static-preview">{uiText.supportSecondaryLabel}</button>
            </>
          ) : (
            <>
              <Link to="/commission" className="btn btn-primary">{uiText.supportPrimaryLabel}</Link>
              <Link to="/contact" className="btn btn-secondary">{uiText.supportSecondaryLabel}</Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
