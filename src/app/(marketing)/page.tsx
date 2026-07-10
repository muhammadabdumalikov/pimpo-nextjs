import LandingPage from "@/components/landing/LandingPage";
import type { Metadata } from "next";

const title = "KPOS - Do'kon va bozor uchun POS va nasiya boshqaruvi";
const description =
  "KPOS - sotuv, nasiya (qarz), inventar, ta'minot va jamoa boshqaruvini bitta tizimda birlashtiruvchi POS platformasi. Bepul boshlang.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kpos.uz"),
  title,
  description,
  applicationName: "KPOS",
  openGraph: {
    type: "website",
    url: "https://kpos.uz",
    siteName: "KPOS",
    title,
    description,
    locale: "uz_UZ",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Home() {
  return <LandingPage />;
}
