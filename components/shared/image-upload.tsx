"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import type { ImageValue } from "@/lib/view-types";
type Props = {
  value?: ImageValue;
  onChange: (value: ImageValue) => void;
  onRemove?: () => void;
  folder: string;
  maxSize?: number;
  aspectRatio?: string;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
};
export default function ImageUpload({
  value,
  onChange,
  onRemove,
  folder,
  maxSize = 5 * 1024 * 1024,
  aspectRatio = "1 / 1",
  onBusyChange,
  label = "Imagem",
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  async function upload(file?: File) {
    if (!file || busy) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > maxSize
    ) {
      setError(
        "Selecione JPEG, PNG ou WEBP de até " +
          Math.round(maxSize / 1024 / 1024) +
          " MB.",
      );
      return;
    }
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", folder);
      const result = await api<ImageValue>("/api/uploads", {
        method: "POST",
        body: form,
      });
      onChange(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div className="upload-field">
      <span>{label}</span>
      <div
        className={"upload-zone " + (drag ? "dragging" : "")}
        style={{ aspectRatio }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void upload(e.dataTransfer.files[0]);
        }}
      >
        {value?.imageUrl ? (
          <img src={value.imageUrl} alt={label} />
        ) : (
          <ImagePlus size={32} />
        )}
        <button
          type="button"
          className="outline-btn"
          disabled={busy}
          onClick={() => ref.current?.click()}
        >
          {busy
            ? "Enviando…"
            : value?.imageUrl
              ? "Substituir imagem"
              : "Selecionar ou arrastar imagem"}
        </button>
      </div>
      <input
        ref={ref}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      {value?.imageUrl && (
        <button
          type="button"
          className="outline-btn"
          disabled={busy}
          onClick={() => {
            onChange({ imageUrl: null, imageKey: null });
            onRemove?.();
          }}
        >
          <Trash2 size={14} /> Remover imagem
        </button>
      )}
      <small>
        JPEG, PNG ou WebP · até {Math.round(maxSize / 1024 / 1024)} MB
      </small>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
