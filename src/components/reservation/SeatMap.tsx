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

function SeatGrid({ seats, reservedSeats, onSeatClick, canReserve, cols = 2 }: Props & { cols?: number }) {
  if (seats.length === 0) return null;
  // label 기준 정렬
  const sorted = [...seats].sort((a, b) => {
    const na = parseInt(a.label);
    const nb = parseInt(b.label);
    return na - nb;
  });

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {sorted.map(seat => {
        const isReserved = reservedSeats.some(r => r.seatId === seat.id);
        return (
          <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />
        );
      })}
    </div>
  );
}

export default function SeatMap({ seats, reservedSeats, onSeatClick, canReserve }: Props) {
  const leftSeats = seats.filter(s => s.col < 1000);
  const rightSeats = seats.filter(s => s.col >= 1000);
  const hasBoth = leftSeats.length > 0 && rightSeats.length > 0;

  // 우측 좌석: 번호 역순으로 표시 (8번이 왼쪽 끝)
  const rightSorted = [...rightSeats].sort((a, b) => {
    const na = parseInt(a.label);
    const nb = parseInt(b.label);
    return nb - na; // 역순
  });

  const rightCols = 8;
  const rightRows = Math.ceil(rightSeats.length / rightCols);

  return (
    <div className="w-full overflow-x-auto">
      {/* 입구 */}
      <div className="bg-gray-200 rounded-lg py-2 text-center text-xs text-gray-500 mb-4 min-w-max">▼ 입구</div>

      {hasBoth ? (
        <div className="flex gap-4 items-start min-w-max">

          {/* ── 왼쪽 영역 ── */}
          <div className="flex gap-2 items-start">
            {/* 서가 (세로 노란 막대) */}
            <div className="self-stretch w-10 bg-amber-100 border-2 border-amber-300 rounded-lg flex items-center justify-center min-h-[200px]">
              <span className="text-sm font-bold text-amber-700 [writing-mode:vertical-rl] tracking-widest">서 가</span>
            </div>

            {/* 좌측 좌석 + 데스크/서가 박스 */}
            <div className="flex flex-col gap-3">
              {/* 좌측 레이블 */}
              <p className="text-xs text-gray-400 text-center">좌측</p>

              {/* 좌측 좌석 */}
              <SeatGrid seats={leftSeats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} cols={2} />

              {/* 데스크 박스 (상단) + 서가 박스 (하단) */}
            </div>
          </div>

          {/* 데스크 + 서가 중앙 박스 */}
          <div className="flex flex-col gap-2 self-start mt-6">
            {/* 데스크 */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-400 font-medium">데스크</span>
              <div className="border-2 border-gray-400 rounded" style={{ width: 160, height: 36 }} />
              <div className="border-2 border-gray-400 rounded" style={{ width: 32, height: 48 }} />
            </div>
            {/* 서가 큰 박스 */}
            <div className="border-2 border-gray-400 rounded flex items-center justify-center" style={{ width: 220, height: 120 }}>
              <span className="text-sm font-medium text-red-400">서 가</span>
            </div>
          </div>

          {/* 정보검색 박스 */}
          <div className="flex flex-col items-center justify-center self-center mt-6">
            <div className="border-2 border-gray-400 rounded flex items-center justify-center" style={{ width: 52, height: 140 }}>
              <span className="text-xs text-red-400 font-medium [writing-mode:vertical-rl]">정보검색</span>
            </div>
          </div>

          {/* 가운데 빈 공간 */}
          <div style={{ width: 80 }} />

          {/* ── 우측 영역 ── */}
          <div className="flex flex-col gap-2">
            {/* 무대 배너 */}
            <div className="bg-purple-100 border border-purple-300 rounded-lg py-2 text-center">
              <span className="text-sm font-bold text-purple-700">🎭 무 대</span>
            </div>

            {/* 우측 레이블 */}
            <p className="text-xs text-gray-400 text-center">우측</p>

            {/* 우측 좌석 - 역순, 8열 */}
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${rightCols}, minmax(0, 1fr))` }}>
              {Array.from({ length: rightRows }, (_, ri) =>
                Array.from({ length: rightCols }, (_, ci) => {
                  const idx = ri * rightCols + ci;
                  const seat = rightSorted[idx];
                  if (!seat) return <div key={`empty-${ri}-${ci}`} className="w-10 h-10" />;
                  const isReserved = reservedSeats.some(r => r.seatId === seat.id);
                  return (
                    <SeatButton key={seat.id} seat={seat} isReserved={isReserved} canReserve={canReserve} onSeatClick={onSeatClick} />
                  );
                })
              )}
            </div>
          </div>

        </div>
      ) : (
        <SeatGrid seats={seats} reservedSeats={reservedSeats} onSeatClick={onSeatClick} canReserve={canReserve} />
      )}
    </div>
  );
}
