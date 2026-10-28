import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Providers } from '../components/providers';
import { FediDevToolbar } from '../components/FediDevToolbar/FediDevToolbar';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'fedi-board-v2',
  description: 'A Fedi Mini App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className={`${body.className} antialiased`}>
        <Providers>
          {children}
          {process.env.NODE_ENV === 'development' && <FediDevToolbar />}
        </Providers>
      </body>
    </html>
  );
}
