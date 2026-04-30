'use client';
import type { Seat } from '@/types';

interface ReservedSeat { seatId: string }

interface Props {
  seats: Seat[];
  reservedSeats: ReservedSeat[];
  onSeatClick?: (seat: Seat) => void;
  canReserve?: boolean;
}

export default function SeatMap({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  const maxRow = Math.max(...seats.map(s => s.row), 0);
  const maxCol = Math.max(...seats.map(s => s.col), 0);

  return (
    <div className="inline-block">
      <div className="w-full bg-gray-200 rounded-lg py-2 text-center text-xs text-gray-500 mb-6">앞 (칠판)</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))` }}>
        {Array.from({ length: maxRow }, (_, rowIdx) =>
          Array.from({ length: maxCol }, (_, colIdx) => {
            const seat = seats.find(s => s.row === rowIdx + 1 && s.col === colIdx + 1);
            if (!seat) return <div key={`${rowIdx}-${colIdx}`} />;
            const isReserved = reservedSeats.some(r => r.seatId === seat.id);
            return (
              <button
                key={seat.id}
                disabled={isReserved || !canReserve}
                onClick={() => !isReserved && canReserve && onSeatClick?.(seat)}
                className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                  isReserved
                    ? 'bg-[#E0E0E0] text-gray-400 cursor-not-allowed'
                    : canReserve
                    ? 'bg-[#B8E0D2] hover:bg-[#9fd4c6] text-gray-700 cursor-pointer'
                    : 'bg-[#B8E0D2] text-gray-700'
                }`}
              >
                {seat.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
