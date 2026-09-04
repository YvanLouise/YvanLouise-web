import { useMemo, useState } from "react";
import { resolvePublicSiteUrl } from "../../lib/publicSite";
import { useEffect, useRef } from "react";

type DeviceKey = "iphone14" | "pixel7" | "galaxyS22";

type PreviewPageKey = "home" | "about" | "works" | "commission" | "support" | "contact";

interface Device {
  key: DeviceKey;
  label: string;
  width: number;
  height: number;
  hasNotch: boolean;
}

const DEVICES: Device[] = [
  { key: "iphone14", label: "iPhone 14 Pro", width: 393, height: 852, hasNotch: true },
  { key: "pixel7", label: "Pixel 7", width: 412, height: 915, hasNotch: true },
  { key: "galaxyS22", label: "Galaxy S22", width: 360, height: 780, hasNotch: false }
];

const PAGES: Array<{ key: PreviewPageKey; label: string }> = [
  { key: "home", label: "首页" },
  { key: "about", label: "关于" },
  { key: "works", label: "作品" },
  { key: "commission", label: "委托" },
  { key: "support", label: "支持" },
  { key: "contact", label: "联系" }
];

export function MobilePreviewWorkbench(): JSX.Element {
  const [device, setDevice] = useState<Device>(DEVICES[0]);
  const [page, setPage] = useState<PreviewPageKey>(PAGES[0].key);
  const [portrait, setPortrait] = useState(true);
  const [revision, setRevision] = useState(0);
  const [connection, setConnection] = useState<"checking" | "ready" | "error">("checking");
  const [availableWidth, setAvailableWidth] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const publicSiteUrl = useMemo(() => resolvePublicSiteUrl(), []);

  const frame = useMemo(() => {
    const width = portrait ? device.width : device.height;
    const height = portrait ? device.height : device.width;
    return { width, height };
  }, [device, portrait]);

  const previewSrc = `${publicSiteUrl}/preview/${page}`;
  const scale = Math.min(1, availableWidth / (frame.width + 24));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setAvailableWidth(Math.max(1, entries[0].contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let cancelled = false;
    setConnection("checking");
    const target = new URL(publicSiteUrl);
    if (!["localhost", "127.0.0.1"].includes(target.hostname)) {
      setConnection("ready");
      clearTimeout(timer);
      return;
    }
    void fetch(`${publicSiteUrl}/__local-launcher`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok || data.service !== "public-site") throw new Error("Not public site");
      if (!cancelled) setConnection("ready");
    }).catch(() => { if (!cancelled) setConnection("error"); }).finally(() => clearTimeout(timer));
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [publicSiteUrl, revision]);

  return (
    <section className="preview-shell panel">
      <h3 style={{ margin: 0 }}>手机端实时预览工作台</h3>
      <p className="meta" style={{ marginTop: 0 }}>
        这里显示公开站最近保存的内容，不包含未保存草稿。切换机型、方向和页面检查效果，画面会自动缩放以适应工作区。
      </p>

      <div className="row">
        <label htmlFor="preview-device" style={{ minWidth: "200px" }}>
          机型
          <select
            id="preview-device"
            value={device.key}
            onChange={(event) => {
              const selected = DEVICES.find((item) => item.key === (event.target.value as DeviceKey));
              if (selected) {
                setDevice(selected);
              }
            }}
          >
            {DEVICES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} ({item.width} x {item.height})
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="preview-page" style={{ minWidth: "160px" }}>
          页面
          <select id="preview-page" value={page} onChange={(event) => setPage(event.target.value as PreviewPageKey)}>
            {PAGES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="preview-orientation" style={{ minWidth: "150px" }}>
          方向
          <select
            id="preview-orientation"
            value={portrait ? "portrait" : "landscape"}
            onChange={(event) => setPortrait(event.target.value === "portrait")}
          >
            <option value="portrait">竖屏</option>
            <option value="landscape">横屏</option>
          </select>
        </label>
      </div>

      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <p className="meta" style={{ margin: 0 }}>
          预览地址：{previewSrc}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => setRevision(value => value + 1)}>刷新预览</button>
        <a className="btn btn-secondary" href={previewSrc} target="_blank" rel="noreferrer">
          在新窗口打开预览
        </a>
      </div>

      <p className="meta" role="status">{connection === "checking" ? "正在连接公开站…" : connection === "error" ? "公开站未启动或不可访问。请运行 start-public-site.bat，再点击刷新预览。" : `${frame.width} × ${frame.height} · 显示比例 ${Math.round(scale * 100)}%`}</p>
      <div ref={containerRef} className="preview-viewport">
      {connection === "ready" ? <div style={{ width: (frame.width + 24) * scale, height: (frame.height + 24) * scale, marginInline: "auto" }}>
      <div
        className={`preview-frame ${device.hasNotch ? "has-notch" : ""}`}
        style={{ width: frame.width + 24, height: frame.height + 24, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <iframe
          title="手机端网站预览"
          key={`${previewSrc}-${revision}`}
          src={previewSrc}
          width={frame.width}
          height={frame.height}
          loading="lazy"
          aria-label="手机端网站预览"
        />
      </div>
      </div> : null}
      </div>
    </section>
  );
}
