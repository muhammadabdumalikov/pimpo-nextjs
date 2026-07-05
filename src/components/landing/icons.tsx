import React from "react";

type IconProps = { className?: string };

const base = "h-6 w-6";

export const CreditIcon = ({ className }: IconProps) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 9.5h19" />
    <path d="M6 15.5h4" />
  </svg>
);

export const PosIcon = ({ className }: IconProps) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18l-1.5 9H5.5L4 4H2" />
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </svg>
);

export const BoxIcon = ({ className }: IconProps) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="M3 8l9 5 9-5" />
    <path d="M12 13v8" />
  </svg>
);

export const ChartIcon = ({ className }: IconProps) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 15l3.5-4 3 2.5L21 7" />
  </svg>
);

export const TruckIcon = ({ className }: IconProps) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6h11v10H2z" />
    <path d="M13 9h4l4 3.5V16h-8z" />
    <circle cx="6.5" cy="18" r="1.6" />
    <circle cx="17.5" cy="18" r="1.6" />
  </svg>
);

export const TeamIcon = ({ className }: IconProps) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8.5" cy="8" r="3" />
    <path d="M2.5 20a6 6 0 0 1 12 0" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6" />
    <path d="M17.5 14a6 6 0 0 1 4 6" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

export const ArrowIcon = ({ className }: IconProps) => (
  <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </svg>
);

export const ChevronIcon = ({ className }: IconProps) => (
  <svg className={className ?? "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const featureIcons = {
  credit: CreditIcon,
  pos: PosIcon,
  box: BoxIcon,
  chart: ChartIcon,
  truck: TruckIcon,
  team: TeamIcon,
} as const;
