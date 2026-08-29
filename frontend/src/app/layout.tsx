import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type React from 'react';
import Providers from '@/lib/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Voice Notes',
  description:
    'AI-powered Voice Notes platform with Gnani Speech-To-Text transcription and Google Gemini summaries.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${inter.className}`}>
      <body className="antialiased font-sans bg-white text-neutral-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
