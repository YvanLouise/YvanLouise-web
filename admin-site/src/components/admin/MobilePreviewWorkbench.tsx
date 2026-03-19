import { useMemo, useState } from "react";
import { resolvePublicSiteUrl } from "../../lib/publicSite";

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
  const publicSiteUrl = useMemo(() => resolvePublicSiteUrl(), []);

  const frame = useMemo(() => {
    const width = portrait ? device.width : device.height;
    const height = portrait ? device.height : device.width;
    return { width, height };
  }, [device, portrait]);

  const previewSrc = `${publicSiteUrl}/preview/${page}`;

  return (
    <section className="preview-shell panel">
      <h3 style={{ margin: 0 }}>手机端实时预览工作台</h3>
      <p className="meta" style={{ marginTop: 0 }}>
        这里直接嵌入访客站的真实页面。你可以切换机型、方向和页面，确认 public-site 在移动端的最终效果。
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
        <a className="btn btn-secondary" href={previewSrc} target="_blank" rel="noreferrer">
          在新窗口打开预览
        </a>
      </div>

      <div
        className={`preview-frame ${device.hasNotch ? "has-notch" : ""}`}
        style={{ width: frame.width + 24, height: frame.height + 24 }}
      >
        <iframe
          title="手机端网站预览"
          src={previewSrc}
          width={frame.width}
          height={frame.height}
          loading="lazy"
          aria-label="手机端网站预览"
        />
      </div>
    </section>
  );
}
