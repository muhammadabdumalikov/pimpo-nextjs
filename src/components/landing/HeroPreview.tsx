"use client";

import { useEffect, useState, type ReactNode } from "react";
import CountUp from "./CountUp";
import { featureIcons } from "./icons";

type T = (key: string) => unknown;

// Shared sample data for the hero preview cards, marquee, and credit bento cell.
export const LEDGER = [
  { name: "Dilnoza Karimova", meta: "12.07", amount: "1 240 000", overdue: true },
  { name: "Sardor Aliyev", meta: "18.07", amount: "680 000", overdue: false },
  { name: "Gulnora Yusupova", meta: "24.07", amount: "420 000", overdue: false },
];

const PAYMENTS = [
  { key: "cash", count: "31", amount: "3 240 000" },
  { key: "card", count: "14", amount: "1 180 000" },
  { key: "credit", count: "3", amount: "640 000" },
];

const VIEW_COUNT = 2;
const ROTATE_MS = 5200;

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white p-5 shadow-2xl shadow-brand-950/40 dark:bg-gray-900">
      {children}
    </div>
  );
}

function Header({ label, sub, icon }: { label: string; sub: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        {icon}
      </div>
    </div>
  );
}

function BigBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-4 rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
      <div className="text-xs font-medium text-brand-700 dark:text-brand-300">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <CountUp
          value={value}
          className="font-mono text-3xl font-extrabold tabular-nums tracking-tight text-brand-700 dark:text-brand-200"
        />
        <span className="text-sm font-medium text-brand-600/70 dark:text-brand-300/70">
          so&apos;m
        </span>
      </div>
    </div>
  );
}

function Row({ title, meta, amount }: { title: string; meta: ReactNode; amount: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          {meta}
        </div>
      </div>
      <div className="flex-none font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
        {amount}
      </div>
    </div>
  );
}

function LedgerView({ tr }: { tr: (k: string) => string }) {
  const Credit = featureIcons.credit;
  return (
    <Card>
      <Header
        label={tr("landing.heroPreview.label")}
        sub={`${LEDGER.length} ${tr("landing.heroPreview.customers")}`}
        icon={<Credit className="h-5 w-5" />}
      />
      <BigBox label={tr("landing.heroPreview.balance")} value={2340000} />
      <div className="mt-4 grid gap-1.5">
        {LEDGER.map((row) => (
          <Row
            key={row.name}
            title={row.name}
            amount={row.amount}
            meta={
              <>
                <span className="font-mono tabular-nums">{row.meta}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    row.overdue
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                  }`}
                >
                  {row.overdue
                    ? tr("landing.heroPreview.overdue")
                    : tr("landing.heroPreview.ontime")}
                </span>
              </>
            }
          />
        ))}
      </div>
    </Card>
  );
}

function SalesView({ tr }: { tr: (k: string) => string }) {
  const Pos = featureIcons.pos;
  return (
    <Card>
      <Header
        label={tr("landing.heroPreview.salesLabel")}
        sub={`48 ${tr("landing.heroPreview.receipts")}`}
        icon={<Pos className="h-5 w-5" />}
      />
      <BigBox label={tr("landing.heroPreview.revenue")} value={5060000} />
      <div className="mt-4 grid gap-1.5">
        {PAYMENTS.map((p) => (
          <Row
            key={p.key}
            title={tr(`landing.heroPreview.${p.key}`)}
            amount={p.amount}
            meta={
              <>
                <span className="font-mono tabular-nums">{p.count}</span>
                <span>{tr("landing.heroPreview.txns")}</span>
              </>
            }
          />
        ))}
      </div>
    </Card>
  );
}

// Rotating stack of dashboard preview cards. Cross-fades on an interval; the CSS
// grid keeps every view in the same cell so the card height never jumps. Auto-
// rotation is disabled under reduced-motion (indicators still switch manually).
export default function HeroPreview({ t }: { t: T }) {
  const [active, setActive] = useState(0);
  const tr = (k: string) => String(t(k));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % VIEW_COUNT), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const views = [<SalesView key="sales" tr={tr} />, <LedgerView key="ledger" tr={tr} />];

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Card deck: the front view sits flat; views behind peek out top-right.
          On rotate, the front slides back into the stack and the next opens up. */}
      <div className="relative grid">
        {views.map((node, i) => {
          const offset = (i - active + VIEW_COUNT) % VIEW_COUNT;
          const front = offset === 0;
          return (
            <div
              key={i}
              aria-hidden={!front}
              style={{
                transform: front
                  ? "translate(0px, 0px) rotate(0deg) scale(1)"
                  : `translate(${offset * 20}px, ${-offset * 16}px) rotate(${offset * 4}deg) scale(${1 - offset * 0.06})`,
                opacity: front ? 1 : Math.max(0.4, 0.7 - (offset - 1) * 0.2),
                zIndex: VIEW_COUNT - offset,
              }}
              className={`col-start-1 row-start-1 transition-[transform,opacity] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none ${
                front ? "" : "pointer-events-none"
              }`}
            >
              {node}
            </div>
          );
        })}
      </div>
      <div className="mt-7 flex justify-center gap-2">
        {views.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ko'rinish ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
