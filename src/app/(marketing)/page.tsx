import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Pimpo — Do'kon va bozor uchun POS va nasiya boshqaruvi",
  description:
    "Pimpo — sotuv, nasiya (qarz), inventar, ta'minot va jamoa boshqaruvini bitta tizimda birlashtiruvchi POS platformasi. Bepul boshlang.",
};

export default function Home() {
  return <LandingPage />;
}
