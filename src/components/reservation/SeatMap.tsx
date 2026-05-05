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
}

export default function SeatMap({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  const leftSeats = seats.filter(s => s.col < 1000);
  const rightSeats = seats.filter(s => s.col >= 1000);
  const hasBoth = leftSeats.length > 0 && rightSeats.length > 0;

  const leftSorted = [...leftSeats].sort((a, b) => parseInt(a.label) - parseInt(b.label));
  const rightSorted = [...rightSeats].sort((a, b) => parseInt(b.label) - parseInt(a.label)); // 역순

  const rightCols = 8;
  const rightRows = Math.ceil(rightSeats.length / rightCols);

  return (
    <div className="w-full overflow-x-auto">
      {/* 입구 */}
      <div className="bg-gray-200 rounded-lg py-2 text-center text-xs text-gray-500 mb-4 min-w-max">▼ 입구</div>

      {hasBoth ? (
        <div className="flex items-start gap-4 min-w-max">

          {/* ── 왼쪽 영역 ── */}
          <div className="flex items-start gap-2">

            {/* 서가 세로 막대 */}
            <div className="self-stretch w-10 bg-amber-100 border-2 border-amber-300 rounded-xl flex items-center justify-center min-h-[220px]">
              <span className="text-sm font-bold text-amber-700 [writing-mode:vertical-rl] tracking-widest">서 가</span>
            </div>

            {/* 좌측 좌석 */}
            <div className="flex flex-col">
              <p className="text-xs text-gray-400 text-center mb-2">좌측</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {leftSorted.map(seat => {
                  const isReserved = reservedSeats.some(r => r.seatId === seat.id);
                  return <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />;
                })}
              </div>
            </div>

            {/* 데스크 + 서가 + 정보검색 박스들 */}
            <div className="flex flex-col gap-2 ml-2 mt-5">
              {/* 데스크 */}
              <div className="bg-sky-100 border-2 border-sky-300 rounded-xl flex items-center justify-center px-4 py-2">
                <span className="text-xs font-bold text-sky-700">데 스 크</span>
              </div>
              {/* 서가 큰 박스 */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-center" style={{ width: 160, height: 100 }}>
                <span className="text-sm font-bold text-amber-600">서 가</span>
              </div>
              {/* 정보검색 */}
              <div className="bg-emerald-100 border-2 border-emerald-300 rounded-xl flex items-center justify-center py-2 px-3">
                <span className="text-xs font-bold text-emerald-700">정보검색</span>
              </div>
            </div>

          </div>

          {/* 가운데 빈 공간 */}
          <div className="flex-1 min-w-[60px]" />

          {/* ── 우측 영역 (오른쪽 끝으로 붙임) ── */}
          <div className="flex flex-col gap-2 ml-auto">
            {/* 무대 배너 */}
            <div className="bg-purple-100 border-2 border-purple-300 rounded-xl py-2 text-center">
              <span className="text-sm font-bold text-purple-700">🎭 무 대</span>
            </div>
            {/* 우측 레이블 */}
            <p className="text-xs text-gray-400 text-center">우측</p>
            {/* 우측 좌석 - 역순 8열 */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rightCols}, minmax(0, 1fr))` }}>
              {Array.from({ length: rightRows }, (_, ri) =>
                Array.from({ length: rightCols }, (_, ci) => {
                  const seat = rightSorted[ri * rightCols + ci];
                  if (!seat) return <div key={`e-${ri}-${ci}`} className="w-10 h-10" />;
                  const isReserved = reservedSeats.some(r => r.seatId === seat.id);
                  return <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />;
                })
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {seats.map(seat => {
            const isReserved = reservedSeats.some(r => r.seatId === seat.id);
            return <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />;
          })}
        </div>
      )}
    </div>
  );
}
