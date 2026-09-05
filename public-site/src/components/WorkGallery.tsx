import { useEffect, useRef, useState } from "react";

function GalleryImage({ src, alt, expanded = false, onOpen }: { src: string; alt: string; expanded?: boolean; onOpen?: () => void }): JSX.Element {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const picture = <img key={retry} src={src} alt={alt} className={expanded ? "lightbox-image" : "gallery-image"} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />;
  return <>
    {!failed ? onOpen ? <button type="button" className="gallery-open-image" aria-label={`放大查看：${alt}`} onClick={onOpen}>{picture}<span className="gallery-open-hint" aria-hidden="true">放大查看 ↗</span></button> : picture : null}
    {!loaded && !failed ? <span className="gallery-loading" role="status">图片加载中…</span> : null}
    {failed ? <div className="gallery-fallback" role="status"><p>这张图片暂时无法加载</p><button type="button" className="btn btn-secondary" onClick={() => { setFailed(false); setLoaded(false); setRetry(value => value + 1); }}>重新加载图片</button><p className="meta">你仍可切换其他图片或继续阅读作品。</p></div> : null}
  </>;
}

export function WorkGallery({ images, title }: { images: string[]; title: string }): JSX.Element {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const swipedRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const lightboxStageRef = useRef<HTMLDivElement>(null);
  const active = Math.min(index, Math.max(0, images.length - 1));
  const move = (step: number): void => { setIndex(current => (current + step + images.length) % images.length); setZoomed(false); };
  const openGallery = (): void => {
    if (swipedRef.current) { swipedRef.current = false; return; }
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setZoomed(false);
    setOpen(true);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      const trigger = triggerRef.current;
      (trigger?.isConnected ? trigger : openButtonRef.current)?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    const strip = thumbnailsRef.current;
    const target = strip?.children[active] as HTMLElement | undefined;
    if (strip && target) strip.scrollLeft = target.offsetLeft - strip.offsetLeft - (strip.clientWidth - target.clientWidth) / 2;
  }, [active]);

  useEffect(() => { lightboxStageRef.current?.scrollTo(0, 0); }, [active, zoomed]);

  const keyboard = (event: React.KeyboardEvent): void => {
    if (zoomed || images.length < 2) return;
    const next = event.key === "ArrowRight" ? (active + 1) % images.length
      : event.key === "ArrowLeft" ? (active + images.length - 1) % images.length
      : event.key === "Home" ? 0 : event.key === "End" ? images.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setIndex(next);
    setZoomed(false);
    if (thumbnailsRef.current?.contains(event.target as Node)) {
      (thumbnailsRef.current.children[next] as HTMLButtonElement)?.focus({ preventScroll: true });
    }
  };
  const swipeStart = (event: React.TouchEvent): void => {
    swipedRef.current = false;
    touchRef.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  };
  const swipeEnd = (event: React.TouchEvent): void => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || zoomed || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swipedRef.current = true; move(dx < 0 ? 1 : -1); }
  };

  if (!images.length) return <article className="panel gallery-empty"><h2>作品图集</h2><p className="meta">暂未添加图片，可继续查看下方作品介绍。</p></article>;

  return <article className="panel stack detail-gallery" aria-label="作品图集" onKeyDown={keyboard}>
    <div className="gallery-toolbar"><h2>作品图集</h2><span className="gallery-count" role="status" aria-live="polite" aria-atomic="true">{active + 1} / {images.length}</span></div>
    <div className="gallery-stage" onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={() => { touchRef.current = null; swipedRef.current = false; }}>
      <GalleryImage key={images[active]} src={images[active]} alt={`${title} · 图片 ${active + 1}`} onOpen={openGallery} />
    </div>
    <div className="gallery-toolbar">
      {images.length > 1 ? <div className="cta-row"><button type="button" className="btn btn-secondary" onClick={() => move(-1)} aria-label="上一张图片">← 上一张</button><button type="button" className="btn btn-secondary" onClick={() => move(1)} aria-label="下一张图片">下一张 →</button></div> : <span className="meta">作品封面 · 原比例展示</span>}
      <button type="button" ref={openButtonRef} className="btn btn-primary" onClick={() => { swipedRef.current = false; openGallery(); }}>放大查看</button>
    </div>
    {images.length > 1 ? <div className="detail-thumbnails" ref={thumbnailsRef} role="group" aria-label="选择图片">{images.map((src, number) => <button key={src} type="button" aria-label={`查看第 ${number + 1} 张图片`} aria-pressed={active === number} onClick={() => { setIndex(number); setZoomed(false); }}><img src={src} alt="" loading="lazy" decoding="async" onError={event => { event.currentTarget.style.visibility = "hidden"; }} /><span>{number + 1}</span></button>)}</div> : null}
    <p className="meta gallery-hint">{images.length > 1 ? "支持左右方向键切图；手机上可左右滑动。" : "点击图片可放大查看，按 Esc 关闭大图。"}</p>
    {open ? <dialog ref={dialogRef} className="work-lightbox" aria-labelledby="lightbox-title" onCancel={event => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)}>
      <div className="lightbox-toolbar"><h2 id="lightbox-title">{title} · {active + 1} / {images.length}</h2><button type="button" className="btn btn-secondary" onClick={() => setZoomed(value => !value)}>{zoomed ? "适应窗口" : "实际尺寸"}</button><button type="button" className="btn btn-primary" autoFocus onClick={() => setOpen(false)}>关闭大图</button></div>
      <div ref={lightboxStageRef} tabIndex={0} role="region" aria-label="大图预览" className={`lightbox-stage ${zoomed ? "is-zoomed" : ""}`} onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={() => { touchRef.current = null; }}><GalleryImage key={images[active]} src={images[active]} alt={`${title} · 大图 ${active + 1}`} expanded /></div>
      <div className="gallery-toolbar">{images.length > 1 ? <button type="button" className="btn btn-secondary" onClick={() => move(-1)}>上一张</button> : null}<span className="meta" role="status" aria-live="polite">{active + 1} / {images.length} · {zoomed ? "滚动查看原图" : images.length > 1 ? "方向键切图" : "原比例展示"} · Esc 关闭</span>{images.length > 1 ? <button type="button" className="btn btn-secondary" onClick={() => move(1)}>下一张</button> : null}</div>
    </dialog> : null}
  </article>;
}
