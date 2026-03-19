import { ChangeEvent, MouseEvent, ReactNode, useEffect, useRef, useState } from "react";
import { uploadAdminAsset } from "../../lib/api";

interface EditableImageBindProps {
  onContextMenu?: (event: MouseEvent<Element>) => void;
  title?: string;
}

interface EditableImageRenderState {
  isUploading: boolean;
}

interface EditableImageProps {
  enabled?: boolean;
  label: string;
  slot: string;
  onUploaded: (url: string) => Promise<void> | void;
  children: (bindProps: EditableImageBindProps, state: EditableImageRenderState) => ReactNode;
}

export function EditableImage({ enabled = false, label, slot, onUploaded, children }: EditableImageProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuPosition) {
      return;
    }

    function closeMenu(): void {
      setMenuPosition(null);
      setError(null);
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuPosition]);

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const uploaded = await uploadAdminAsset(file, slot);
      await onUploaded(uploaded.url);
      setMenuPosition(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传或保存失败。");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function openFilePicker(): void {
    inputRef.current?.click();
  }

  const bindProps: EditableImageBindProps = enabled
    ? {
        onContextMenu: (event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuPosition({ x: event.clientX, y: event.clientY });
          setError(null);
        },
        title: `${label}，右键可从本地替换图片`
      }
    : {};

  return (
    <>
      {children(bindProps, { isUploading })}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => void handleFileSelect(event)} />

      {enabled && menuPosition ? (
        <div className="editable-image-menu" style={{ left: menuPosition.x, top: menuPosition.y }} role="menu">
          <strong>{label}</strong>
          <button
            type="button"
            className="mini-btn"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
            disabled={isUploading}
          >
            {isUploading ? "上传中..." : "从本地替换图片"}
          </button>
          <p className="meta" style={{ margin: 0 }}>替换后会自动保存到当前站点数据。</p>
          {error ? <p className="notice error" style={{ margin: 0 }}>{error}</p> : null}
        </div>
      ) : null}
    </>
  );
}
