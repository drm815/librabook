'use client';
import TimetableCell from './TimetableCell';
import type { TimetableDay, Period, Reservation } from '@/types';

interface Props {
  days: TimetableDay[];
  periods: Period[];
  getReservation: (date: string, periodId: string) => Reservation | undefined;
  onCellClick?: (date: string, periodId: string, reservation?: Reservation) => void;
  userRole?: string;
}

export default function TimetableGrid({ days, periods, getReservation, onCellClick, userRole }: Props) {
  const schoolDays = days.filter(d => !['토', '일'].includes(d.dayOfWeek));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-20 p-2 text-left text-gray-500 font-normal text-xs">교시</th>
            {schoolDays.map(d => (
              <th key={d.id} className="p-2 text-center min-w-[80px]">
                <div className="font-medium text-xs text-gray-700">{d.date.slice(5)}</div>
                <div className="text-xs text-gray-400">{d.dayOfWeek}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => (
            <tr key={period.id} className="border-t border-gray-50">
              <td className="p-2">
                <div className="text-xs font-medium text-gray-700">{period.name}</div>
                <div className="text-xs text-gray-400">{period.startTime}</div>
              </td>
              {schoolDays.map(day => {
                const reservation = getReservation(day.date, period.id);
                return (
                  <td key={day.id} className="p-1">
                    <TimetableCell
                      date={day.date}
                      periodId={period.id}
                      reservation={reservation}
                      isHoliday={day.isHoliday}
                      onClick={() => onCellClick?.(day.date, period.id, reservation)}
                      userRole={userRole}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
