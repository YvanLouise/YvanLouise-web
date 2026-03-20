import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { uploadAdminAsset } from "../../lib/api";
import { MusicPreviewClip } from "../../types";

const MAX_AUDIO_UPLOAD_BYTES = 50 * 1024 * 1024;

function createEmptyClip(): MusicPreviewClip {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `clip-${Date.now()}`,
    label: "",
    sourceUrl: "",
    sourceName: "",
    startTime: 0,
    endTime: 15
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value: number): string {
  const safe = Math.max(0, Math.floor(value));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatMegabytes(value: number): string {
  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

interface MusicClipLibraryEditorProps {
  savedClips: MusicPreviewClip[];
  draftClips: MusicPreviewClip[];
  onDraftClipsChange: (clips: MusicPreviewClip[]) => void;
  onPersistClips: (clips: MusicPreviewClip[]) => Promise<void>;
}

export function MusicClipLibraryEditor({
  savedClips,
  draftClips,
  onDraftClipsChange,
  onPersistClips
}: MusicClipLibraryEditorProps): JSX.Element {
  const [clipDraft, setClipDraft] = useState<MusicPreviewClip>(createEmptyClip());
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const maxRange = useMemo(() => Math.max(duration, clipDraft.endTime, 30), [clipDraft.endTime, duration]);

  useEffect(() => {
    if (!draftClips.length && editingClipId) {
      setEditingClipId(null);
      setClipDraft(createEmptyClip());
    }
  }, [draftClips, editingClipId]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        window.clearInterval(previewTimerRef.current);
      }
    };
  }, []);

  function resetDraft(): void {
    setEditingClipId(null);
    setClipDraft(createEmptyClip());
    setDuration(0);
    setStatus(null);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }

  function startEditClip(clip: MusicPreviewClip): void {
    setEditingClipId(clip.id);
    setClipDraft({ ...clip });
    setStatus(`正在编辑片段：${clip.label}`);
  }

  function updateClipDraft(patch: Partial<MusicPreviewClip>): void {
    setClipDraft((prev) => ({ ...prev, ...patch }));
  }

  async function handleAudioUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      setStatus(`音频文件过大，当前 ${formatMegabytes(file.size)}，请控制在 ${formatMegabytes(MAX_AUDIO_UPLOAD_BYTES)} 以内。`);
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadAdminAsset(file, "music-preview");
      setClipDraft((prev) => ({
        ...prev,
        sourceUrl: uploaded.url,
        sourceName: file.name,
        label: prev.label || file.name.replace(/\.[^.]+$/, "")
      }));
      setStatus(`已上传音频：${file.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "音频上传失败。" );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function useCurrentTimeAs(field: "startTime" | "endTime"): void {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    setClipDraft((prev) => {
      if (field === "startTime") {
        return {
          ...prev,
          startTime: clamp(currentTime, 0, Math.max(0, prev.endTime - 0.2))
        };
      }

      return {
        ...prev,
        endTime: Math.max(currentTime, prev.startTime + 0.2)
      };
    });
  }

  function previewCurrentClip(): void {
    const audio = audioRef.current;
    if (!audio || !clipDraft.sourceUrl) {
      setStatus("请先上传一段音频，再预听截取片段。");
      return;
    }

    if (previewTimerRef.current) {
      window.clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    const safeStart = clamp(clipDraft.startTime, 0, maxRange);
    const safeEnd = Math.max(clipDraft.endTime, safeStart + 0.2);
    audio.currentTime = safeStart;
    void audio.play();
    setStatus(`正在预听：${clipDraft.label || clipDraft.sourceName || "未命名片段"}`);

    previewTimerRef.current = window.setInterval(() => {
      if (audio.currentTime >= safeEnd) {
        audio.pause();
        if (previewTimerRef.current) {
          window.clearInterval(previewTimerRef.current);
          previewTimerRef.current = null;
        }
      }
    }, 80);
  }

  async function saveClip(): Promise<void> {
    const normalizedClip: MusicPreviewClip = {
      ...clipDraft,
      label: clipDraft.label.trim(),
      sourceName: clipDraft.sourceName.trim(),
      sourceUrl: clipDraft.sourceUrl.trim(),
      startTime: Number(clipDraft.startTime.toFixed(2)),
      endTime: Number(clipDraft.endTime.toFixed(2))
    };

    if (!normalizedClip.label || !normalizedClip.sourceName || !normalizedClip.sourceUrl) {
      setStatus("请先填写片段名称并上传音频文件。");
      return;
    }

    if (normalizedClip.endTime <= normalizedClip.startTime) {
      setStatus("片段结束时间必须大于开始时间。");
      return;
    }

    const nextClips = draftClips.some((clip) => clip.id === normalizedClip.id)
      ? draftClips.map((clip) => (clip.id === normalizedClip.id ? normalizedClip : clip))
      : [normalizedClip, ...draftClips];

    onDraftClipsChange(nextClips);

    try {
      await onPersistClips(nextClips);
      setEditingClipId(normalizedClip.id);
      setClipDraft(normalizedClip);
      setStatus(`片段库已保存：${normalizedClip.label}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "片段库保存失败。" );
    }
  }

  async function removeClip(clipId: string): Promise<void> {
    const nextClips = draftClips.filter((clip) => clip.id !== clipId);
    onDraftClipsChange(nextClips);

    try {
      await onPersistClips(nextClips);
      if (editingClipId === clipId) {
        resetDraft();
      }
      setStatus("已从片段库移除该片段。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "删除片段失败。" );
    }
  }

  return (
    <section className="panel stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="stack" style={{ gap: "0.35rem" }}>
          <h3 style={{ margin: 0 }}>音乐片段库</h3>
          <p className="meta" style={{ margin: 0 }}>
            上传本地音乐后，可以一边试听一边截取开始与结束时间，前台会从这里随机抽取片段播放。
          </p>
        </div>
        <div className="cta-row">
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "上传中..." : "上传本地音乐"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={resetDraft}>新片段</button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={(event) => void handleAudioUpload(event)} />

      <div className="music-library-layout">
        <article className="music-library-list stack">
          {savedClips.length ? (
            savedClips.map((clip) => (
              <div key={clip.id} className={`music-library-item ${editingClipId === clip.id ? "active" : ""}`}>
                <div>
                  <strong>{clip.label}</strong>
                  <p className="meta" style={{ margin: "0.25rem 0 0" }}>{clip.sourceName}</p>
                  <p className="meta" style={{ margin: "0.25rem 0 0" }}>{formatSeconds(clip.startTime)} - {formatSeconds(clip.endTime)}</p>
                </div>
                <div className="row">
                  <button type="button" className="mini-btn" onClick={() => startEditClip(clip)}>编辑</button>
                  <button type="button" className="mini-btn" onClick={() => void removeClip(clip.id)}>删除</button>
                </div>
              </div>
            ))
          ) : (
            <p className="meta" style={{ margin: 0 }}>片段库还没有内容，先上传一段本地音乐吧。</p>
          )}
        </article>

        <article className="music-library-editor stack">
          <label>
            片段名称
            <input value={clipDraft.label} onChange={(event) => updateClipDraft({ label: event.target.value })} placeholder="例如 夜巡前奏 / Boss 战前 15 秒" />
          </label>
          <label>
            原始文件名
            <input value={clipDraft.sourceName} onChange={(event) => updateClipDraft({ sourceName: event.target.value })} placeholder="上传后会自动填写" />
          </label>
          <label>
            音频地址
            <input value={clipDraft.sourceUrl} onChange={(event) => updateClipDraft({ sourceUrl: event.target.value })} placeholder="上传后会自动填写" />
          </label>

          <audio
            ref={audioRef}
            controls
            src={clipDraft.sourceUrl || undefined}
            preload="metadata"
            onLoadedMetadata={(event) => {
              const nextDuration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
              setDuration(nextDuration);
              setClipDraft((prev) => ({
                ...prev,
                endTime: prev.endTime > 0 ? Math.min(prev.endTime, nextDuration || prev.endTime) : Math.min(15, nextDuration || 15)
              }));
            }}
          />

          <div className="music-clip-grid">
            <label>
              开始时间（秒）
              <input
                type="number"
                min={0}
                max={maxRange}
                step="0.1"
                value={clipDraft.startTime}
                onChange={(event) => updateClipDraft({ startTime: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              结束时间（秒）
              <input
                type="number"
                min={0.1}
                max={maxRange || 999}
                step="0.1"
                value={clipDraft.endTime}
                onChange={(event) => updateClipDraft({ endTime: Math.max(0.1, Number(event.target.value) || 0.1) })}
              />
            </label>
          </div>

          <label>
            开始位置
            <input
              type="range"
              min={0}
              max={maxRange}
              step="0.1"
              value={Math.min(clipDraft.startTime, maxRange)}
              onChange={(event) => updateClipDraft({ startTime: Math.min(Number(event.target.value), clipDraft.endTime - 0.2) })}
            />
          </label>
          <label>
            结束位置
            <input
              type="range"
              min={0.1}
              max={maxRange}
              step="0.1"
              value={Math.min(Math.max(clipDraft.endTime, 0.1), maxRange)}
              onChange={(event) => updateClipDraft({ endTime: Math.max(Number(event.target.value), clipDraft.startTime + 0.2) })}
            />
          </label>

          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => useCurrentTimeAs("startTime")}>用当前播放位置设为起点</button>
            <button type="button" className="btn btn-secondary" onClick={() => useCurrentTimeAs("endTime")}>用当前播放位置设为终点</button>
            <button type="button" className="btn btn-secondary" onClick={previewCurrentClip}>预听截取片段</button>
          </div>

          <p className="meta" style={{ margin: 0 }}>
            当前截取范围：{formatSeconds(clipDraft.startTime)} - {formatSeconds(clipDraft.endTime)}
          </p>

          <button type="button" className="btn btn-primary" onClick={() => void saveClip()}>保存到片段库</button>
          {status ? <p className="notice">{status}</p> : null}
        </article>
      </div>
    </section>
  );
}
