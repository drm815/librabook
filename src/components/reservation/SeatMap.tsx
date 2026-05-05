'use client';
import type { Seat } from '@/types';

interface ReservedSeat { seatId: string }

interface Props {
  seats: Seat[];
  reservedSeats: ReservedSeat[];
  onSeatClick?: (seat: Seat) => void;
  canReserve?: boolean;
}

function SeatButton({ seat, isReserved, canReserve, onSeatClick }: {
  seat: Seat;
  isReserved: boolean;
  canReserve?: boolean;
  onSeatClick?: (seat: Seat) => void;
}) {
  return (
    <button
      disabled={isReserved || !canReserve}
      onClick={() => !isReserved && canReserve && onSeatClick?.(seat)}
      className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
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
}

export default function SeatMap({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  const leftSeats = seats.filter(s => s.col < 1000);
  const rightSeats = seats.filter(s => s.col >= 1000);
  const hasBoth = leftSeats.length > 0 && rightSeats.length > 0;

  const leftSorted = [...leftSeats].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  const rightSorted = [...rightSeats].sort((a, b) => a.row !== b.row ? a.row - b.row : (a.col - 1000) - (b.col - 1000));

  const rightCols = 8;
  const rightRows = Math.ceil(rightSeats.length / rightCols);

  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <div className="inline-flex flex-col items-stretch">
      {/* 입구 */}
      <div className="bg-gray-200 rounded-lg py-2 text-center text-xs text-gray-500 mb-3">▼ 입구</div>

      {hasBoth ? (
        <div className="flex items-start gap-8">

          {/* ── 왼쪽 영역 ── */}
          <div className="flex items-start gap-6">

            {/* 서가 세로 막대 */}
            <div className="self-stretch w-9 bg-amber-100 border-2 border-amber-300 rounded-xl flex items-center justify-center min-h-[200px]">
              <span className="text-sm font-bold text-amber-700 [writing-mode:vertical-rl] tracking-widest">서 가</span>
            </div>

            {/* 좌측 좌석 */}
            <div className="flex flex-col">
              <p className="text-xs text-gray-400 text-center mb-1">좌측</p>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {leftSorted.map(seat => {
                  const isReserved = reservedSeats.some(r => r.seatId === seat.id);
                  return <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />;
                })}
              </div>
            </div>

            {/* 데스크 + 서가 큰박스 */}
            <div className="flex flex-col gap-6 mt-4">
              {/* 데스크 */}
              <div className="bg-sky-100 border-2 border-sky-300 rounded-xl flex items-center justify-center px-3 py-2">
                <span className="text-xs font-bold text-sky-700">데 스 크</span>
              </div>
              {/* 서가 큰 박스 */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-center" style={{ width: 130, height: 90 }}>
                <span className="text-sm font-bold text-amber-600">서 가</span>
              </div>
            </div>

          </div>


          {/* ── 우측 영역: 정보검색 + 무대/좌석 나란히 ── */}
          <div className="flex items-start gap-1">
            {/* 정보검색 - 우측 좌석 왼쪽에 붙임, 높이 절반 */}
            <div className="bg-emerald-100 border-2 border-emerald-300 rounded-xl flex items-center justify-center px-2 self-start mt-10" style={{ height: 60 }}>
              <span className="text-xs font-bold text-emerald-700 [writing-mode:vertical-rl] tracking-widest">정보검색</span>
            </div>
            {/* 무대 + 우측 좌석 */}
            <div className="flex flex-col gap-2">
              {/* 무대 배너 */}
              <div className="bg-purple-100 border-2 border-purple-300 rounded-xl py-2 text-center">
                <span className="text-sm font-bold text-purple-700">🎭 무 대</span>
              </div>
              {/* 우측 레이블 */}
              <p className="text-xs text-gray-400 text-center">우측</p>
              {/* 우측 좌석 - 역순 8열 */}
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${rightCols}, minmax(0, 1fr))` }}>
                {Array.from({ length: rightRows }, (_, ri) =>
                  Array.from({ length: rightCols }, (_, ci) => {
                    const seat = rightSorted[ri * rightCols + ci];
                    if (!seat) return <div key={`e-${ri}-${ci}`} className="w-9 h-9" />;
                    const isReserved = reservedSeats.some(r => r.seatId === seat.id);
                    return <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />;
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {seats.map(seat => {
            const isReserved = reservedSeats.some(r => r.seatId === seat.id);
            return <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />;
          })}
        </div>
      )}
      </div>
    </div>
  );
}
