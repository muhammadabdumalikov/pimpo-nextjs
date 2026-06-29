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
      <body className="dark:bg-gray-900" suppressHydrationWarning>
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
