'use client';
import type { Seat } from '@/types';

interface ReservedSeat { seatId: string }

interface Props {
  seats: Seat[];
  reservedSeats: ReservedSeat[];
  onSeatClick?: (seat: Seat) => void;
  canReserve?: boolean;
}

function SeatGrid({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  if (seats.length === 0) return null;
  const rows = Math.max(...seats.map(s => s.row));
  // col을 1000 오프셋 제거해서 정규화
  const colOffset = Math.min(...seats.map(s => s.col)) >= 1000 ? 1000 : 0;
  const cols = Math.max(...seats.map(s => s.col - colOffset));

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: rows }, (_, ri) =>
        Array.from({ length: cols }, (_, ci) => {
          const seat = seats.find(s => s.row === ri + 1 && s.col - colOffset === ci + 1);
          if (!seat) return <div key={`${ri}-${ci}`} style={{ width: 40, height: 40 }} />;
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
  );
}

export default function SeatMap({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  const leftSeats = seats.filter(s => s.col < 1000);
  const rightSeats = seats.filter(s => s.col >= 1000);
  const hasBoth = leftSeats.length > 0 && rightSeats.length > 0;

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-lg py-2 text-center text-xs text-gray-500 mb-6">▼ 입구</div>
      {hasBoth ? (
        <div className="flex gap-8 justify-center flex-wrap">
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">좌측</p>
            <SeatGrid seats={leftSeats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
          </div>
          <div className="border-l border-dashed border-gray-200" />
          <div>
            <p className="text-xs text-gray-400 text-center mb-2">우측</p>
            <SeatGrid seats={rightSeats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
          </div>
        </div>
      ) : (
        <SeatGrid seats={seats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
      )}
    </div>
  );
}
