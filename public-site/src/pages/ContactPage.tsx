import { Link } from "react-router-dom";
import { useSiteSettings } from "@shared/context/SiteSettingsContext";

export function ContactPage(): JSX.Element {
  const settings = useSiteSettings();
  const socialLinks = settings.socialLinks.filter((item) => item.label && item.url);

  return (
    <>
      <section className="hero">
        <span className="badge">{settings.uiText.pageBadges.contact}</span>
        <h1>联系与合作</h1>
        <p>访客站当前采用静态展示模式，站内私信入口已隐藏。你可以通过下面的公开联系方式、委托页面和支持页面继续找到我。</p>
      </section>

      <section className="section support-grid">
        <article className="panel stack">
          <h2 style={{ margin: 0 }}>公开联系方式</h2>
          <p style={{ margin: 0 }}>优先使用你最常用的平台联系我，方便我后续继续跟进合作或作品交流。</p>
          <div className="cta-row">
            {socialLinks.map((item) => (
              <a key={`${item.label}-${item.url}`} className="btn btn-secondary" href={item.url} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        </article>

        <article className="panel stack">
          <h2 style={{ margin: 0 }}>委托合作</h2>
          <p style={{ margin: 0 }}>如果你已经有明确的合作方向、需求范围或预算预期，建议先查看委托页面，再带着更完整的信息来联系我。</p>
          <div className="cta-row">
            <Link className="btn btn-primary" to="/commission">查看委托说明</Link>
          </div>
        </article>

        <article className="panel stack">
          <h2 style={{ margin: 0 }}>支持创作</h2>
          <p style={{ margin: 0 }}>如果你想直接支持我持续发布新的音乐、软件、游戏和动画作品，也可以通过支持页或爱发电入口参与。</p>
          <div className="cta-row">
            <Link className="btn btn-secondary" to="/support">前往支持页</Link>
            {settings.afdianUrl ? (
              <a className="btn btn-secondary" href={settings.afdianUrl} target="_blank" rel="noreferrer">
                前往爱发电
              </a>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}