"use client";

import { useRef, useState } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { uploadService, ApiClientError } from "@/services/uploadService";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { isImageFile, isPdfFile, previewUrl, resourceTypeForFile, thumbnailUrl } from "@/lib/cloudinaryMedia";

function asList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export function FileUpload({
  label,
  value,
  onChange,
  accept,
  maxSizeMb = 10,
  maxFiles = 1,
  folder = "forms",
  resourceType = "auto",
  disabled,
  error,
  hint,
  requiredMark,
  destroyOnChange = true,
}) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [localError, setLocalError] = useState("");
  const files = asList(value);
  const multiple = maxFiles > 1;
  const busy = progress != null;
  const message = error || localError;

  function emit(next) {
    if (multiple) onChange(next);
    else onChange(next[0] || null);
  }

  async function destroyAsset(file) {
    if (!destroyOnChange || !file?.publicId) return;
    try {
      await uploadService.destroy({ publicId: file.publicId, resourceType: file.resourceType || resourceType });
    } catch {
      // Keep local removal even if Cloudinary already dropped the asset.
    }
  }

  async function removeAt(index) {
    const target = files[index];
    await destroyAsset(target);
    emit(files.filter((_, fileIndex) => fileIndex !== index));
  }

  async function onPick(event) {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (!picked.length) return;
    setLocalError("");
    const remaining = Math.max(0, maxFiles - files.length);
    if (multiple && remaining === 0) {
      setLocalError(`You can upload up to ${maxFiles} files`);
      return;
    }
    const batch = multiple ? picked.slice(0, remaining) : picked.slice(0, 1);
    const maxBytes = maxSizeMb * 1024 * 1024;
    const tooLarge = batch.find((file) => file.size > maxBytes);
    if (tooLarge) {
      setLocalError(`File is larger than ${maxSizeMb} MB`);
      return;
    }
    try {
      const uploaded = [];
      for (const file of batch) {
        setProgress(0);
        const record = await uploadService.uploadFile(file, {
          folder,
          resourceType: resourceTypeForFile(file, resourceType),
          onProgress: setProgress,
        });
        uploaded.push(record);
      }
      emit(multiple ? [...files, ...uploaded].slice(0, maxFiles) : uploaded);
      if (!multiple && files[0]?.publicId && files[0].publicId !== uploaded[0]?.publicId) {
        destroyAsset(files[0]);
      }
    } catch (err) {
      setLocalError(err instanceof ApiClientError ? err.message : err.message || "Could not upload file");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="block min-w-0 max-w-full space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-text">
          {label}
          {requiredMark ? (
            <span className="ml-0.5 font-semibold text-danger" aria-label="required">
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <div className={cn("rounded-md border border-border bg-surface p-3", message && "border-danger")}>
        {disabled ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || (multiple && files.length >= maxFiles)}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {busy ? `Uploading ${progress}%` : "Choose file"}
            </Button>
            {hint ? <p className="text-xs text-muted">{hint}</p> : null}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || busy}
          className="sr-only"
          onChange={onPick}
        />
        {disabled && !files.length ? <p className="text-sm text-muted">No file uploaded</p> : null}
        {busy ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        {files.length ? (
          <ul className="mt-3 space-y-2">
            {files.map((file, index) => (
              <li key={file.publicId || file.url || file.name} className="flex items-center gap-3">
                {isImageFile(file) || isPdfFile(file) ? (
                  <img src={thumbnailUrl(file)} alt="" className="h-14 w-10 shrink-0 rounded-md object-cover bg-slate-100" />
                ) : (
                  <Paperclip className="h-4 w-4 shrink-0 text-muted" />
                )}
                <div className="min-w-0 flex-1">
                  {isPdfFile(file) ? (
                    <p className="truncate text-sm">{file.name || "PDF uploaded"}</p>
                  ) : file.url ? (
                    <a href={previewUrl(file)} target="_blank" rel="noreferrer" className="truncate text-sm text-primary hover:underline">
                      {file.name || "View file"}
                    </a>
                  ) : (
                    <p className="truncate text-sm">{file.name}</p>
                  )}
                  {file.size ? <p className="text-xs text-muted">{Math.ceil(file.size / 1024)} KB</p> : null}
                </div>
                {!disabled ? (
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => removeAt(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {message ? <p className="text-xs text-danger">{message}</p> : null}
    </div>
  );
}
