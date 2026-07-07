"use client";

import { useEffect, useRef } from "react";

// Space-grouped integer, e.g. 2340000 -> "2 340 000".
function group(n: number): string {
  return Math.round(n).toLocaleString("en-US").replace(/,/g, " ");
}

// Counts up to `value` when scrolled into view. Writes straight to the DOM node
// via a ref (rAF), never React state, so it doesn't re-render the tree
// (skill 5.D). Collapses to the final value under reduced-motion.
export default function CountUp({
  value,
  duration = 1400,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = group(value);
      return;
    }

    let raf = 0;
    let start = 0;
    let done = false;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done) return;
        done = true;
        io.disconnect();
        const tick = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = group(value * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
