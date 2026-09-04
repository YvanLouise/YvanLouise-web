import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { resolveMediaUrl } from "../../lib/workMedia";
import { clipBounds, ensureAudioReady } from "../../lib/audioPlayback";
import type { MusicPreviewClip } from "../../types";

function formatSeconds(value: number): string {
  const safe = Math.max(0, Math.floor(value));
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, "0")}`;
}

export function MusicPreviewPanel({ clips }: { clips: MusicPreviewClip[] }): JSX.Element {
  const { uiText } = useSiteSettings();
  const copy = uiText.works;
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const boundsRef = useRef<{ start: number; end: number } | null>(null);
  const [selectedId, setSelectedId] = useState(clips[0]?.id ?? "");
  const [activeClip, setActiveClip] = useState<MusicPreviewClip | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing" | "paused" | "ended" | "error">("idle");
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const selected = clips.find((clip) => clip.id === selectedId) ?? clips[0];

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      requestRef.current?.abort();
      if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    };
  }, []);

  function stop(): void {
    requestRef.current?.abort();
    requestRef.current = null;
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
    boundsRef.current = null;
    setPhase("idle");
    setElapsed(0);
    setDuration(0);
  }

  async function play(clip: MusicPreviewClip, resume = false): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    audio.pause();
    setSelectedId(clip.id);
    setActiveClip(clip);
    setPhase("loading");
    setError("");
    if (!resume) { setElapsed(0); setDuration(0); boundsRef.current = null; }
    try {
      await ensureAudioReady(audio, resolveMediaUrl(clip.sourceUrl), request.signal);
      if (request.signal.aborted) return;
      const bounds = clipBounds(clip.startTime, clip.endTime, audio.duration);
      boundsRef.current = bounds;
      setDuration(bounds.end - bounds.start);
      if (!resume || audio.currentTime < bounds.start || audio.currentTime >= bounds.end) audio.currentTime = bounds.start;
      audio.volume = volume;
      await audio.play();
      if (request.signal.aborted) return;
      setPhase("playing");
    } catch (cause) {
      if (request.signal.aborted) return;
      audio.pause();
      setError(cause instanceof Error ? cause.message : "播放失败，请重试。");
      setPhase("error");
    }
  }

  function onTimeUpdate(): void {
    const audio = audioRef.current;
    const bounds = boundsRef.current;
    if (!audio || !bounds) return;
    const current = Math.max(0, Math.min(bounds.end - bounds.start, audio.currentTime - bounds.start));
    setElapsed(current);
    if (audio.currentTime >= bounds.end) { audio.pause(); setPhase("ended"); }
  }

  const status = phase === "loading" ? "正在加载音频，可停止或切换曲目…" : phase === "error" ? error :
    phase === "playing" ? `${copy.musicPreviewPlayingPrefix}${activeClip?.label ?? ""}` : phase === "paused" ? "已暂停，可继续试听" :
    phase === "ended" ? `${copy.musicPreviewEndedPrefix}${activeClip?.label ?? ""}` : clips.length ? copy.musicPreviewReadyStatus : copy.musicPreviewEmptyStatus;

  return <section className="panel music-preview-panel stack">
    <div className="stack" style={{ gap: "0.4rem" }}>
      <span className="badge">{copy.musicPreviewBadge}</span>
      <h3 style={{ margin: 0 }}>{copy.musicPreviewTitle}</h3>
      <p className="meta" style={{ margin: 0 }}>{activeClip ? `${activeClip.sourceName} · ${formatSeconds(activeClip.startTime)} - ${formatSeconds(activeClip.endTime)}` : copy.musicPreviewInfoEmpty}</p>
    </div>
    <label className="stack">选择试听曲目
      <select value={selected?.id ?? ""} disabled={!clips.length} onChange={(event) => { stop(); setSelectedId(event.target.value); setActiveClip(null); }}>
        {!clips.length ? <option value="">暂无曲目</option> : clips.map((clip) => <option key={clip.id} value={clip.id}>{clip.label}</option>)}
      </select>
    </label>
    <div className="cta-row">
      <button type="button" className="btn btn-primary" disabled={!selected || phase === "loading"} onClick={() => {
        if (phase === "playing") { audioRef.current?.pause(); setPhase("paused"); }
        else if (selected) void play(selected, phase === "paused" && activeClip?.id === selected.id);
      }}>{phase === "playing" ? "暂停" : phase === "paused" ? "继续试听" : phase === "error" ? "重试播放" : "播放所选曲目"}</button>
      <button type="button" className="btn btn-secondary" disabled={!clips.length} onClick={() => {
        const alternatives = clips.filter((clip) => clip.id !== activeClip?.id);
        const pool = alternatives.length ? alternatives : clips;
        void play(pool[Math.floor(Math.random() * pool.length)]);
      }}>{copy.musicPreviewPlayLabel}</button>
      <button type="button" className="btn btn-secondary" disabled={phase === "idle"} onClick={stop}>{copy.musicPreviewStopLabel}</button>
    </div>
    <label className="stack">试听进度
      <input type="range" min={0} max={duration || 1} step={0.1} value={elapsed} disabled={!duration || phase === "loading" || phase === "error" || phase === "idle"} aria-valuetext={`${formatSeconds(elapsed)} / ${formatSeconds(duration)}`} onChange={(event) => {
        if (audioRef.current && boundsRef.current) { audioRef.current.currentTime = boundsRef.current.start + Number(event.target.value); setElapsed(Number(event.target.value)); }
      }} />
    </label>
    <div className="music-preview-meta"><strong>{activeClip?.label ?? copy.musicPreviewBadge}</strong><span>{formatSeconds(elapsed)} / {formatSeconds(duration)}</span></div>
    <label className="audio-volume">音量 {Math.round(volume * 100)}%
      <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); if (audioRef.current) audioRef.current.volume = next; }} />
    </label>
    <p className="meta" role="status" style={{ margin: 0 }}>{status}</p>
    <audio ref={audioRef} preload="none" onTimeUpdate={onTimeUpdate} onEnded={() => setPhase("ended")} onError={() => {
      if (requestRef.current && !requestRef.current.signal.aborted) { setError("音频加载失败，请重试或选择其他曲目。"); setPhase("error"); }
    }} />
  </section>;
}
