import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Foydalanish shartlari | KPOS",
  description: "KPOS xizmatidan foydalanish shartlari.",
};

// NOTE: generic starter text — have it reviewed by a lawyer before launch.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/"
        className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        ← KPOS
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        Foydalanish shartlari
      </h1>
      <p className="mt-2 text-sm text-gray-400">Oxirgi yangilanish: 2026-yil iyul</p>

      <div className="prose-sm mt-8 space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Umumiy qoidalar</h2>
          <p className="mt-2">
            KPOS — chakana savdo do&apos;konlari uchun kassa, ombor va nasiya
            hisobini yuritish xizmati. Ro&apos;yxatdan o&apos;tish orqali siz
            ushbu shartlarga rozilik bildirasiz.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Hisob qaydnomasi</h2>
          <p className="mt-2">
            Hisob qaydnomangiz xavfsizligi (login va parolni sir saqlash) uchun
            siz javobgarsiz. Hisobingiz orqali amalga oshirilgan barcha amallar
            sizning nomingizdan bajarilgan hisoblanadi.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. To&apos;lovlar va tariflar</h2>
          <p className="mt-2">
            Pullik tariflar oylik asosda to&apos;lanadi. Tarifni istalgan vaqtda
            o&apos;zgartirish yoki bekor qilish mumkin — bekor qilinganda xizmat
            to&apos;langan davr oxirigacha ishlashda davom etadi.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Ma&apos;lumotlar</h2>
          <p className="mt-2">
            Siz kiritgan biznes ma&apos;lumotlari (mahsulotlar, sotuvlar,
            mijozlar, qarzlar) sizga tegishli. Ularga ishlov berish tartibi{" "}
            <Link href="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">
              Maxfiylik siyosati
            </Link>
            da belgilangan.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Javobgarlik cheklovi</h2>
          <p className="mt-2">
            Xizmat &quot;boricha&quot; taqdim etiladi. Rejalashtirilgan texnik
            ishlar haqida oldindan xabar beramiz va ma&apos;lumotlaringiz
            muntazam zaxiralanadi.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Shartlarning o&apos;zgarishi</h2>
          <p className="mt-2">
            Shartlar yangilanishi mumkin; muhim o&apos;zgarishlar haqida xizmat
            ichida yoki email orqali xabar beramiz.
          </p>
        </section>
      </div>
    </main>
  );
}
