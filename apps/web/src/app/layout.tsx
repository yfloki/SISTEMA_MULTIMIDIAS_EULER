import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { ProfileProvider } from '@/lib/profile';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'AURORA+',
  description: 'Streaming adaptativo — Sistemas de Multimídia',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
