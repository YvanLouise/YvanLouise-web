export function clipBounds(start: number, end: number, duration: number): { start: number; end: number } {
  if (![start, end, duration].every(Number.isFinite) || duration <= 0) throw new Error("音频时长无效。");
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(duration, end);
  if (safeEnd <= safeStart) throw new Error("试听区间超出了音频时长。");
  return { start: safeStart, end: safeEnd };
}

export function ensureAudioReady(audio: HTMLAudioElement, src: string, signal: AbortSignal, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = (): void => {
      clearTimeout(timer);
      audio.removeEventListener("loadedmetadata", ready);
      audio.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const ready = (): void => { cleanup(); resolve(); };
    const failed = (): void => { cleanup(); reject(new Error("音频加载失败，请重试或选择其他曲目。")); };
    const aborted = (): void => { cleanup(); reject(signal.reason); };
    if (signal.aborted) { aborted(); return; }
    audio.addEventListener("loadedmetadata", ready);
    audio.addEventListener("error", failed);
    signal.addEventListener("abort", aborted, { once: true });
    timer = setTimeout(() => { cleanup(); reject(new Error("音频加载超时，请检查网络后重试。")); }, timeoutMs);
    if (audio.getAttribute("src") !== src || audio.error) {
      audio.src = src;
      audio.load();
    } else if (audio.readyState >= 1) ready();
  });
}
