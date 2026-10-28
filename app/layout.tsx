import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { Providers } from '../components/providers';
import { FediDevToolbar } from '../components/FediDevToolbar/FediDevToolbar';
import { APP_NAME, APP_TAGLINE } from '../lib/config';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = { title: APP_NAME, description: APP_TAGLINE };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0a0a0a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className={`${body.className} antialiased bg-bg text-text`}>
        <Providers>
          {children}
          {process.env.NODE_ENV === 'development' && <FediDevToolbar />}
        </Providers>
      </body>
    </html>
  );
}
