import localFont from 'next/font/local';

// Gilroy is self-hosted from public/font/Gilroy. It covers Latin + Russian Cyrillic,
// but NOT the Uzbek-specific Cyrillic letters қ Қ ғ Ғ ҳ Ҳ — those are handled by the
// Cyrillic-complete fallback stack defined for --font-outfit in globals.css.
export const gilroy = localFont({
  // Only the weights actually used in the app are bundled: font-normal (400),
  // font-medium (500), font-semibold (600), font-bold (700), font-extrabold
  // (800), plus the one italic face used (400 italic — rich-text notes and a
  // few `font-normal italic` labels). Unused weights (100/200/300/900) and the
  // italics of the heavier weights were removed to trim the bundle.
  src: [
    { path: '../../public/font/Gilroy/Gilroy-Regular_0.ttf', weight: '400', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-RegularItalic_0.ttf', weight: '400', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Medium_0.ttf', weight: '500', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-Semibold_0.ttf', weight: '600', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-Bold_0.ttf', weight: '700', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-Extrabold_0.ttf', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-gilroy',
});
