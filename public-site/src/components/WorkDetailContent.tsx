import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { workTextParts } from "@shared/lib/workDetail";

export function WorkDetailText({ text }: { text: string }): JSX.Element {
  return <div className="detail-prose">
    {text.trim().split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>
      {workTextParts(paragraph).map((part, number) => part.href
        ? <a key={number} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}<span className="sr-only">（在新窗口打开）</span></a>
        : part.text)}
    </p>)}
  </div>;
}

export function WorkDetailOutline({ items }: { items: { id: string; label: string }[] }): JSX.Element {
  const location = useLocation();
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const update = (): void => {
      const passed = items.filter(item => (document.getElementById(item.id)?.getBoundingClientRect().top ?? Infinity) <= 180);
      const current = passed[passed.length - 1];
      setActive(current?.id ?? items[0]?.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [items]);

  return <nav className="panel detail-outline stack" aria-label="本页目录">
    <div className="gallery-toolbar"><h2>本页目录</h2><span className="detail-eyebrow">CONTENTS</span></div>
    <ol>{items.map((item, index) => <li key={item.id}>
      <Link to={`${location.pathname}${location.search}#${item.id}`} state={location.state} replace
        aria-current={active === item.id ? "location" : undefined}
        onClick={() => {
          const target = document.getElementById(item.id);
          target?.scrollIntoView({ behavior: "auto", block: "start" });
          target?.focus({ preventScroll: true });
        }}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{item.label}</Link>
    </li>)}</ol>
  </nav>;
}

export function WorkCover({ src, title }: { src?: string; title: string }): JSX.Element {
  const [failed, setFailed] = useState(false);
  return <div className="detail-related-cover">{src && !failed
    ? <img src={src} alt={`${title} 封面`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span aria-label="暂无封面">{title.slice(0, 1)}</span>}</div>;
}

export function WorkDetailJump({ items }: { items: { id: string; label: string }[] }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  return <label className="detail-mobile-jump">本页目录
    <select value="" onChange={event => {
      const id = event.currentTarget.value;
      if (!id) return;
      navigate(`${location.pathname}${location.search}#${id}`, { replace: true, state: location.state });
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    }}><option value="">跳转到作品内容…</option>{items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
  </label>;
}
