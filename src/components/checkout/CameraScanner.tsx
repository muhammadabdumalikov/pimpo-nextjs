"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Modal } from "@/components/ui/modal";
import { useTranslations } from "@/hooks/useTranslations";

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the decoded barcode/QR text. */
  onDetected: (code: string) => void;
}

// Ignore the same code if it fires again within this window, so a barcode held
// in front of the camera doesn't add the item dozens of times per second.
const DUPLICATE_WINDOW_MS = 1500;

export default function CameraScanner({
  isOpen,
  onClose,
  onDetected,
}: CameraScannerProps) {
  const { t } = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        setError("");
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            // De-dupe rapid repeats of the same code.
            if (
              code === lastRef.current.code &&
              now - lastRef.current.at < DUPLICATE_WINDOW_MS
            ) {
              return;
            }
            lastRef.current = { code, at: now };
            onDetected(code);
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e) {
        if (!cancelled) {
          setError(
            (e as Error)?.message ||
              t("checkout.cameraError") ||
              "Could not access the camera",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isOpen, onDetected, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="m-4 max-w-[480px] p-6"
    >
      <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("checkout.cameraTitle") || "Scan with camera"}
      </h4>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {t("checkout.cameraHint") || "Point the camera at a barcode"}
      </p>

      {error ? (
        <div className="rounded-lg bg-error-50 px-4 py-6 text-center text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            className="h-[320px] w-full object-cover"
            muted
            playsInline
          />
          {/* Aiming guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 h-11 w-full rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
      >
        {t("checkout.cameraClose") || "Close"}
      </button>
    </Modal>
  );
}
