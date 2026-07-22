import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Maxfiylik siyosati | KPOS",
  description: "KPOS maxfiylik siyosati — ma'lumotlaringiz qanday saqlanadi.",
};

// NOTE: generic starter text — have it reviewed by a lawyer before launch.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/"
        className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        ← KPOS
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        Maxfiylik siyosati
      </h1>
      <p className="mt-2 text-sm text-gray-400">Oxirgi yangilanish: 2026-yil iyul</p>

      <div className="prose-sm mt-8 space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Qanday ma&apos;lumotlar yig&apos;iladi</h2>
          <p className="mt-2">
            Ro&apos;yxatdan o&apos;tishda biznes nomi, login va email; xizmatdan
            foydalanishda esa siz kiritgan operatsion ma&apos;lumotlar
            (mahsulotlar, sotuvlar, mijozlar, nasiya yozuvlari) saqlanadi.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Ma&apos;lumotlardan foydalanish</h2>
          <p className="mt-2">
            Ma&apos;lumotlaringiz faqat xizmatni ko&apos;rsatish uchun
            ishlatiladi. Ular uchinchi shaxslarga sotilmaydi va reklama
            maqsadida uzatilmaydi.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Saqlash va xavfsizlik</h2>
          <p className="mt-2">
            Ma&apos;lumotlar shifrlangan aloqa (HTTPS) orqali uzatiladi va
            muntazam zaxira nusxalari olinadigan serverlarda saqlanadi.
            Hisobingizga kirish faqat parol orqali amalga oshiriladi.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Sizning huquqlaringiz</h2>
          <p className="mt-2">
            Istalgan vaqtda o&apos;z ma&apos;lumotlaringizni eksport qilishni
            yoki hisobingiz bilan birga o&apos;chirilishini so&apos;rashingiz
            mumkin.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Murojaat</h2>
          <p className="mt-2">
            Maxfiylik bo&apos;yicha savollar uchun{" "}
            <Link href="/" className="text-brand-600 hover:underline dark:text-brand-400">
              bosh sahifadagi
            </Link>{" "}
            aloqa kanallari orqali murojaat qiling.
          </p>
        </section>
      </div>
    </main>
  );
}
