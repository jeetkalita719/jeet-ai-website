import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { Analytics } from '@vercel/analytics/react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jeetkalita.com';
const TITLE = 'Jeet Kalita — AI Engineer';
const DESCRIPTION =
  'Chat with Jeet Kalita’s AI assistant. He builds AI chatbots, agents, automations and modern websites for businesses and creators — shipped and live.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['Jeet Kalita', 'AI Engineer', 'AI chatbot', 'RAG', 'LangGraph', 'automation', 'AI agency', 'India', 'Next.js'],
  authors: [{ name: 'Jeet Kalita', url: SITE_URL }],
  creator: 'Jeet Kalita',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Jeet Kalita',
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
  icons: { icon: [{ url: '/favicon.svg', sizes: 'any' }], shortcut: '/favicon.svg', apple: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // matches the dark --background so mobile browser chrome doesn't sit white
  themeColor: '#09090b',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <body className={cn('bg-background min-h-screen font-sans antialiased', inter.variable)}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <main className="flex min-h-screen flex-col">{children}</main>
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
