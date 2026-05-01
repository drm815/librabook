'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#FDF6F0]">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/admin/timetable" className="text-gray-600 hover:text-[#E8899A]">타임테이블</Link>
          <Link href="/admin/schedule" className="text-gray-600 hover:text-[#E8899A]">스케줄</Link>
          <Link href="/admin/dashboard" className="text-gray-600 hover:text-[#E8899A]">대시보드</Link>
        </nav>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          로그아웃
        </button>
      </header>
      {children}
    </div>
  );
}
