"use client";

import React, { useRef } from "react";
import Label from "@/components/form/Label";
import { uploadStorageFile } from "@/lib/api";

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const MAX_SIZE_MB = 10;

interface ImageUploadProps {
  id?: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  prefix?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  id = "image-upload",
  value,
  onChange,
  prefix = "uploads",
  label,
  disabled = false,
  className = "",
}: ImageUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_SIZE_MB} MB`);
      return;
    }
    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      setError("Allowed: JPEG, PNG, GIF, WebP");
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadStorageFile(file, prefix);
      onChange(url);
    } catch (err) {
      setError((err as Error)?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange(null);
    setError("");
  }

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex shrink-0 items-center gap-3">
          {value ? (
            <div className="relative">
              <img
                src={value}
                alt=""
                className="h-24 w-24 rounded-xl border border-gray-200 object-cover dark:border-gray-700"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-error-500 text-white shadow hover:bg-error-600"
                  aria-label="Remove image"
                >
                  <span className="text-sm leading-none">×</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {uploading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
              ) : (
                <span className="text-xs text-gray-400">No image</span>
              )}
            </div>
          )}
          {!disabled && (
            <label className="cursor-pointer">
              <input
                ref={inputRef}
                id={id}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={handleFile}
                disabled={uploading}
              />
              <span className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                {uploading ? "Uploading…" : value ? "Change" : "Upload"}
              </span>
            </label>
          )}
        </div>
        {error && (
          <p className="text-sm text-error-500 dark:text-error-400">{error}</p>
        )}
      </div>
    </div>
  );
}
