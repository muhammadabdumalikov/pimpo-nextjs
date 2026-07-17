"use client";
import { useEffect } from "react";

/**
 * Lock background (body) scroll while `locked` is true — e.g. while a drawer or
 * overlay is open. Restores the previous overflow on unlock/unmount. Mirrors the
 * shared Modal component's approach so drawers behave consistently.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous || "unset";
    };
  }, [locked]);
}
