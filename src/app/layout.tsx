import { Outfit } from 'next/font/google';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <LocaleProvider>
          <SubscriptionProvider>
            <ThemeProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </ThemeProvider>
          </SubscriptionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
