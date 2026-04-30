'use client';
import type { Reservation } from '@/types';

interface Props {
  date: string;
  periodId: string;
  reservation?: Pick<Reservation, 'id' | 'type' | 'status' | 'className' | 'grade'> & { teacherName?: string };
  isHoliday: boolean;
  onClick?: () => void;
  userRole?: string;
}

const TYPE_COLORS: Record<string, string> = {
  class: 'bg-[#B8E0D2] text-[#333]',
  event: 'bg-[#C9B8E8] text-[#333]',
  'self-study': 'bg-[#F9C4D2] text-[#333]',
};

export default function TimetableCell({ reservation, isHoliday, onClick, userRole }: Props) {
  if (isHoliday) {
    return <div className="h-10 bg-[#E0E0E0] rounded text-xs text-gray-400 flex items-center justify-center">휴일</div>;
  }

  if (!reservation) {
    return (
      <button
        onClick={onClick}
        className="h-10 w-full bg-white border border-gray-100 rounded hover:border-[#E8899A] hover:bg-[#FDF6F0] transition-colors text-xs text-gray-400"
      >
        {userRole === 'teacher' || userRole === 'admin' ? '예약' : ''}
      </button>
    );
  }

  const colorClass = TYPE_COLORS[reservation.type] ?? 'bg-gray-100';
  return (
    <button
      onClick={onClick}
      className={`h-10 w-full rounded text-xs font-medium truncate px-1 ${colorClass}`}
    >
      {reservation.type === 'class' && reservation.grade ? `${reservation.grade}반` : reservation.type === 'event' ? '행사' : '자율'}
    </button>
  );
}
