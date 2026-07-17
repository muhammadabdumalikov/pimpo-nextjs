"use client";
import React, { useRef } from "react";
import Image from "next/image";
import { PlusIcon, PencilIcon, TrashBinIcon } from "@/icons/index";
import type { ReceiptTplStrings } from "@/lib/receiptTemplateI18n";

interface ImageUploadProps {
  src: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  strings: ReceiptTplStrings;
  label?: string;
}

const MAX = 5 * 1024 * 1024;

export default function ImageUpload({
  src,
  onUpload,
  onRemove,
  strings: L,
  label = L.uploadLogo,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (file?: File) => {
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      alert(L.imageUpload.onlyJpgPng);
      return;
    }
    if (file.size > MAX) {
      alert(L.imageUpload.tooLarge);
      return;
    }
    onUpload(file);
  };

  return (
    <div>
      {src ? (
        <div className="space-y-3">
          <div className="relative flex h-28 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <Image src={src} alt="" fill className="object-contain p-3" unoptimized />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              <PencilIcon /> {L.imageUpload.replace}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
            >
              <TrashBinIcon /> {L.imageUpload.remove}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex h-28 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="text-center">
            <PlusIcon className="mx-auto mb-1 text-brand-500" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {label}
            </p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
