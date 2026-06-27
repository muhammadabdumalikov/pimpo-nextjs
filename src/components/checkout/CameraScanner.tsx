"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { useTranslations } from "@/hooks/useTranslations";

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the decoded barcode/QR text. */
  onDetected: (code: string) => void;
  /** Name of the last item added, shown as a live overlay on the preview. */
  lastScanned?: string;
}

// Ignore the same code if it fires again within this window, so a barcode held
// in front of the camera doesn't add the item dozens of times per second.
const DUPLICATE_WINDOW_MS = 1500;

/**
 * Inline camera barcode scanner. Renders a compact live preview in the page
 * flow (not a modal) so the cart and product list stay visible while scanning.
 */
export default function CameraScanner({
  isOpen,
  onClose,
  onDetected,
  lastScanned,
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

  if (!isOpen) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-error-500" />
          </span>
          {t("checkout.cameraTitle") || "Scan with camera"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/[0.06]"
        >
          {t("checkout.cameraClose") || "Close"}
        </button>
      </div>

      {error ? (
        <div className="bg-error-50 px-4 py-6 text-center text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      ) : (
        <div className="relative bg-black">
          <video
            ref={videoRef}
            className="mx-auto h-[200px] w-full max-w-[420px] object-cover sm:h-[240px]"
            muted
            playsInline
          />
          {/* Aiming guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-3/5 max-w-[260px] rounded-lg border-2 border-white/80" />
          </div>
          {/* Live "added" feedback, overlaid so the cashier never looks away */}
          {lastScanned && (
            <div className="absolute inset-x-0 bottom-0 bg-success-600/90 px-4 py-2 text-center text-sm font-medium text-white">
              ✓ {t("checkout.scanAdded") || "Added"}: {lastScanned}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
