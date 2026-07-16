import { gilroy } from './fonts';
import './globals.css';
import "flatpickr/dist/flatpickr.css";
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={gilroy.variable}>
      {/* The page canvas sits a step darker than the white/gray-900 surfaces
          on it, so cards, inputs and the layout visibly separate in both
          themes. */}
      <body className="bg-gray-100 dark:bg-gray-950" suppressHydrationWarning>
        <AuthProvider>
          <LocaleProvider>
            <SubscriptionProvider>
              <ThemeProvider>
                <SidebarProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </SidebarProvider>
              </ThemeProvider>
            </SubscriptionProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
