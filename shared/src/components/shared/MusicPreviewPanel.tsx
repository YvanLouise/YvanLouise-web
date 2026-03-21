import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { resolveMediaUrl } from "../../lib/workMedia";
import { MusicPreviewClip } from "../../types";

const BASE_FADE_SECONDS = 0.8;
const TICK_MS = 80;

function formatSeconds(value: number): string {
  const safe = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chooseRandomClip(clips: MusicPreviewClip[], currentId?: string): MusicPreviewClip {
  if (clips.length === 1) {
    return clips[0];
  }

  const candidates = clips.filter((clip) => clip.id !== currentId);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? clips[0];
}

async function ensureAudioReady(audio: HTMLAudioElement, src: string): Promise<void> {
  if (audio.src !== src) {
    await new Promise<void>((resolve, reject) => {
      const handleReady = (): void => {
        cleanup();
        resolve();
      };
      const handleError = (): void => {
        cleanup();
        reject(new Error("音频加载失败"));
      };
      const cleanup = (): void => {
        audio.removeEventListener("loadedmetadata", handleReady);
        audio.removeEventListener("canplay", handleReady);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("loadedmetadata", handleReady);
      audio.addEventListener("canplay", handleReady);
      audio.addEventListener("error", handleError);
      audio.src = src;
      audio.load();
    });
    return;
  }

  if (audio.readyState < 1) {
    await new Promise<void>((resolve, reject) => {
      const handleReady = (): void => {
        cleanup();
        resolve();
      };
      const handleError = (): void => {
        cleanup();
        reject(new Error("音频加载失败"));
      };
      const cleanup = (): void => {
        audio.removeEventListener("loadedmetadata", handleReady);
        audio.removeEventListener("canplay", handleReady);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("loadedmetadata", handleReady);
      audio.addEventListener("canplay", handleReady);
      audio.addEventListener("error", handleError);
    });
  }
}

interface MusicPreviewPanelProps {
  clips: MusicPreviewClip[];
}

export function MusicPreviewPanel({ clips }: MusicPreviewPanelProps): JSX.Element {
  const { uiText } = useSiteSettings();
  const copy = uiText.works;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [activeClip, setActiveClip] = useState<MusicPreviewClip | null>(null);
  const [status, setStatus] = useState<string>(clips.length ? copy.musicPreviewReadyStatus : copy.musicPreviewEmptyStatus);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const hasClips = clips.length > 0;
  const clipDuration = activeClip ? Math.max(0, activeClip.endTime - activeClip.startTime) : 0;

  const clipMeta = useMemo(() => {
    if (!activeClip) {
      return copy.musicPreviewInfoEmpty;
    }

    return `${activeClip.sourceName} · ${formatSeconds(activeClip.startTime)} - ${formatSeconds(activeClip.endTime)}`;
  }, [activeClip, copy.musicPreviewInfoEmpty]);

  useEffect(() => {
    setStatus(clips.length ? copy.musicPreviewReadyStatus : copy.musicPreviewEmptyStatus);
  }, [clips.length, copy.musicPreviewEmptyStatus, copy.musicPreviewReadyStatus]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.volume = 1;
      }
    };
  }, []);

  function stopPlayback(nextStatus?: string): void {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.volume = 1;
    }

    setIsPlaying(false);
    setProgress(0);
    setElapsed(0);
    if (nextStatus) {
      setStatus(nextStatus);
    }
  }

  async function playClip(clip: MusicPreviewClip): Promise<void> {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    stopPlayback();
    setActiveClip(clip);
    setStatus(`${copy.musicPreviewPlayingPrefix}${clip.label}`);

    await ensureAudioReady(audio, resolveMediaUrl(clip.sourceUrl));
    const safeStart = clamp(clip.startTime, 0, Number.isFinite(audio.duration) ? audio.duration : clip.startTime);
    const safeEnd = clamp(Math.max(clip.endTime, safeStart + 0.5), safeStart + 0.5, Number.isFinite(audio.duration) ? audio.duration : clip.endTime);
    const duration = safeEnd - safeStart;
    const localFade = Math.min(BASE_FADE_SECONDS, Math.max(0.25, duration / 3));

    audio.currentTime = safeStart;
    audio.volume = 0;
    await audio.play();
    setIsPlaying(true);

    timerRef.current = window.setInterval(() => {
      const currentTime = audio.currentTime;
      const currentElapsed = Math.max(0, currentTime - safeStart);
      const remaining = safeEnd - currentTime;

      if (currentTime >= safeEnd || remaining <= 0) {
        stopPlayback(`${copy.musicPreviewEndedPrefix}${clip.label}`);
        return;
      }

      let volume = 1;
      if (currentElapsed < localFade) {
        volume = currentElapsed / localFade;
      } else if (remaining < localFade) {
        volume = remaining / localFade;
      }
      audio.volume = clamp(volume, 0, 1);
      setElapsed(currentElapsed);
      setProgress(duration > 0 ? clamp(currentElapsed / duration, 0, 1) : 0);
    }, TICK_MS);
  }

  async function handleRandomPlay(): Promise<void> {
    if (!hasClips) {
      setStatus(copy.musicPreviewEmptyStatus);
      return;
    }

    try {
      const nextClip = chooseRandomClip(clips, activeClip?.id);
      await playClip(nextClip);
    } catch (error) {
      stopPlayback();
      setStatus(error instanceof Error ? error.message : "随机播放失败，请稍后再试。");
    }
  }

  return (
    <section className="panel music-preview-panel stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="stack" style={{ gap: "0.4rem" }}>
          <span className="badge">{copy.musicPreviewBadge}</span>
          <h3 style={{ margin: 0 }}>{copy.musicPreviewTitle}</h3>
          <p className="meta" style={{ margin: 0 }}>{clipMeta}</p>
        </div>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={() => void handleRandomPlay()} disabled={!hasClips}>
            {isPlaying ? copy.musicPreviewSwitchLabel : copy.musicPreviewPlayLabel}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => stopPlayback(hasClips ? copy.musicPreviewStoppedStatus : copy.musicPreviewEmptyStatus)}
            disabled={!isPlaying}
          >
            {copy.musicPreviewStopLabel}
          </button>
        </div>
      </div>

      <div className="music-preview-progress" aria-hidden="true">
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="music-preview-meta">
        <strong>{activeClip?.label ?? copy.musicPreviewBadge}</strong>
        <span>{clipDuration > 0 ? `${formatSeconds(elapsed)} / ${formatSeconds(clipDuration)}` : copy.musicPreviewWaitingLabel}</span>
      </div>

      <p className="meta" style={{ margin: 0 }}>{status}</p>

      <audio ref={audioRef} preload="metadata" />
    </section>
  );
}


