import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Guionbajo Cloud',
  description: 'Master English with Your AI Tutor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans min-h-screen bg-brand-dark text-brand-text-primary selection:bg-brand-accent/30 selection:text-white antialiased">
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { background: '#12142A', color: '#FFF', border: '1px solid #252849' } }} />
      </body>
    </html>
  );
}
