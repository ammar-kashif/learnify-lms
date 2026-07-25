import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import MotionProvider from '@/components/providers/motion-provider';

const inter = Inter({ subsets: ['latin'] });

const DESCRIPTION =
  'Join Learnify — Pakistan’s leading online academy for O Levels and IGCSE students. Get personalized tutoring, past paper practice, and guaranteed results in Maths, Physics, Chemistry, Biology, Computer Science and English.';

export const metadata: Metadata = {
  title: {
    default: 'Learnify — Online O Level & IGCSE Academy',
    template: '%s | Learnify',
  },
  description: DESCRIPTION,
  keywords: [
    'O Level',
    'IGCSE',
    'online tutoring',
    'Pakistan',
    'past papers',
    'Maths',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
  ],
  authors: [{ name: 'Learnify Team' }],
  openGraph: {
    title: 'Learnify — Online O Level & IGCSE Academy',
    description: DESCRIPTION,
    type: 'website',
    siteName: 'Learnify',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learnify — Online O Level & IGCSE Academy',
    description: DESCRIPTION,
  },
};

// Next 14 wants viewport as its own export, not a `metadata` key.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <MotionProvider>{children}</MotionProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
