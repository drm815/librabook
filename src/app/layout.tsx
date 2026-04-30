import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansKR = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-noto' });

export const metadata: Metadata = {
  title: 'LibraBook - 도서관 예약 시스템',
  description: '중학교 도서관 수업 시간 예약 및 관리',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKR.variable}`}>
      <body className="min-h-screen bg-white text-[#333333]">
        {children}
      </body>
    </html>
  );
}
