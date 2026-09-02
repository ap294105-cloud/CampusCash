import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://campus-cash-student-budget.ap294105.chatgpt.site'),
  title: 'Campus Cash — Student Budget Dashboard',
  description: 'A private, practical college budget tracker for spending, savings, fees, and goals.',
  openGraph: {
    title: 'Campus Cash — Student Budget Dashboard',
    description: 'Student finance, sorted. Track spending, budgets, savings, fees, and goals in one place.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Campus Cash student budget dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus Cash — Student Budget Dashboard',
    description: 'Student finance, sorted. Track spending, budgets, savings, fees, and goals in one place.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
