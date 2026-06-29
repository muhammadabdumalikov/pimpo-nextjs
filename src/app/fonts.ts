import localFont from 'next/font/local';

// Gilroy is self-hosted from public/font/Gilroy. It covers Latin + Russian Cyrillic,
// but NOT the Uzbek-specific Cyrillic letters қ Қ ғ Ғ ҳ Ҳ — those are handled by the
// Cyrillic-complete fallback stack defined for --font-outfit in globals.css.
export const gilroy = localFont({
  src: [
    { path: '../../public/font/Gilroy/Gilroy-Thin_0.ttf', weight: '100', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-ThinItalic_0.ttf', weight: '100', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-UltraLight_0.ttf', weight: '200', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-UltraLightItalic_0.ttf', weight: '200', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Light_0.ttf', weight: '300', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-LightItalic_0.ttf', weight: '300', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Regular_0.ttf', weight: '400', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-RegularItalic_0.ttf', weight: '400', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Medium_0.ttf', weight: '500', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-MediumItalic_0.ttf', weight: '500', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Semibold_0.ttf', weight: '600', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-SemiboldItalic_0.ttf', weight: '600', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Bold_0.ttf', weight: '700', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-BoldItalic_0.ttf', weight: '700', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Extrabold_0.ttf', weight: '800', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-ExtraboldItalic_0.ttf', weight: '800', style: 'italic' },
    { path: '../../public/font/Gilroy/Gilroy-Black_0.ttf', weight: '900', style: 'normal' },
    { path: '../../public/font/Gilroy/Gilroy-BlackItalic_0.ttf', weight: '900', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-gilroy',
});
