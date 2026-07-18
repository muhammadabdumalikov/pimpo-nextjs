"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "@/icons/index";
import { useTranslations } from "@/hooks/useTranslations";

interface BackButtonProps {
  /** Parent route to return to. Omit to fall back to browser history. */
  href?: string;
  /** Label override; defaults to the translated "Back". */
  label?: string;
  className?: string;
}

/**
 * Consistent "‹ Back" control for inner pages reached from a sub-menu's landing
 * page (e.g. /receipts → /receipts/new). Renders a Link when `href` is given so
 * it also works on a fresh deep-link; falls back to router.back() otherwise.
 */
export default function BackButton({ href, label, className = "" }: BackButtonProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const cls =
    "mb-4 inline-flex items-center gap-1 text-theme-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90 " +
    className;
  const inner = (
    <>
      <ChevronLeftIcon className="h-4 w-4" />
      {label ?? t("common.back")}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => router.back()} className={cls}>
      {inner}
    </button>
  );
}
