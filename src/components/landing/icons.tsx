import type { IconType } from "react-icons";
import {
  LuCreditCard,
  LuShoppingCart,
  LuPackage,
  LuChartColumn,
  LuTruck,
  LuUsers,
  LuClock,
  LuWallet,
  LuClipboardCheck,
  LuCloudOff,
  LuArrowRightLeft,
  LuUndo2,
  LuCheck,
  LuArrowRight,
  LuChevronDown,
  LuGlobe,
} from "react-icons/lu";

type IconProps = { className?: string };

// Landing glyphs are Lucide icons (via react-icons/lu), matching the rest of the
// app. Thin wrappers preserve each call-site's original default size, so markup
// that passes no className renders at the same dimensions as before.
const lucide =
  (Glyph: IconType, fallback: string) =>
  function LucideIcon({ className }: IconProps) {
    return <Glyph className={className ?? fallback} />;
  };

export const CreditIcon = lucide(LuCreditCard, "h-6 w-6");
export const PosIcon = lucide(LuShoppingCart, "h-6 w-6");
export const BoxIcon = lucide(LuPackage, "h-6 w-6");
export const ChartIcon = lucide(LuChartColumn, "h-6 w-6");
export const TruckIcon = lucide(LuTruck, "h-6 w-6");
export const TeamIcon = lucide(LuUsers, "h-6 w-6");
export const ShiftIcon = lucide(LuClock, "h-6 w-6");
export const WalletIcon = lucide(LuWallet, "h-6 w-6");
export const ClipboardIcon = lucide(LuClipboardCheck, "h-6 w-6");
export const CloudIcon = lucide(LuCloudOff, "h-6 w-6");
export const ExchangeIcon = lucide(LuArrowRightLeft, "h-6 w-6");
export const UndoIcon = lucide(LuUndo2, "h-6 w-6");
export const CheckIcon = lucide(LuCheck, "h-5 w-5");
export const ArrowIcon = lucide(LuArrowRight, "h-4 w-4");
export const ChevronIcon = lucide(LuChevronDown, "h-5 w-5");
export const GlobeIcon = lucide(LuGlobe, "h-5 w-5");

export const featureIcons = {
  credit: CreditIcon,
  pos: PosIcon,
  box: BoxIcon,
  chart: ChartIcon,
  truck: TruckIcon,
  team: TeamIcon,
  shift: ShiftIcon,
  wallet: WalletIcon,
  clipboard: ClipboardIcon,
  cloud: CloudIcon,
  exchange: ExchangeIcon,
  undo: UndoIcon,
} as const;
