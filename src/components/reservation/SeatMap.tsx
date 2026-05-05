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
      {/* 전체 레이아웃: 서가(좌) | 중앙 | 우측구역 */}
      <div className="flex gap-3 w-full">

        {/* 서가 - 왼쪽 벽, 입구부터 아래까지 */}
        <div className="flex flex-col shrink-0 w-10">
          <div className="text-[10px] text-gray-400 text-center mb-1">입구</div>
          <div className="flex-1 bg-amber-100 border border-amber-300 rounded-lg flex items-center justify-center min-h-[200px]">
            <span className="text-sm font-bold text-amber-700 [writing-mode:vertical-rl] tracking-widest">서 가</span>
          </div>
        </div>

        {/* 중앙: 좌측 좌석 */}
        {hasBoth ? (
          <div className="flex flex-col shrink-0">
            {/* 입구 표시 (서가 옆) */}
            <div className="bg-gray-200 rounded-lg py-1.5 text-center text-xs text-gray-500 mb-3">▼ 입구</div>
            <p className="text-xs text-gray-400 text-center mb-2">좌측</p>
            <SeatGrid seats={leftSeats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
          </div>
        ) : (
          <div className="flex-1">
            <div className="bg-gray-200 rounded-lg py-1.5 text-center text-xs text-gray-500 mb-3">▼ 입구</div>
            <SeatGrid seats={seats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
          </div>
        )}

        {/* 가운데 빈 공간 */}
        {hasBoth && <div className="flex-1" />}

        {/* 우측 구역: 무대(상단) + 우측 좌석(하단) */}
        {hasBoth && (
          <div className="flex flex-col shrink-0">
            {/* 무대 - 상단 */}
            <div className="bg-purple-100 border border-purple-300 rounded-lg py-2 px-4 text-center mb-3">
              <span className="text-xs font-bold text-purple-700">🎭 무 대</span>
            </div>
            {/* 우측 좌석 - 무대 아래 */}
            <p className="text-xs text-gray-400 text-center mb-2">우측</p>
            <SeatGrid seats={rightSeats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
          </div>
        )}
      </div>
    </div>
  );
}
