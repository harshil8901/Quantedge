import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import PageTransition from '@/components/PageTransition';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'QuantEdge',
  description: 'Institutional AI valuation and market intelligence platform for professional investors.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#050816] text-[#F8FAFC] selection:bg-[#4F8CFF]/20 selection:text-white">
        <Providers>
          <Navbar />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
