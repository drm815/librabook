export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  subject?: string;       // 선생님만
  studentId?: string;     // 학생만
  passwordHash: string;
  createdAt: string;
}

export interface Period {
  id: string;
  name: string;           // '1교시', '점심시간' 등
  startTime: string;      // 'HH:mm'
  endTime: string;
}

export interface TimetableDay {
  id: string;
  month: string;          // 'YYYY-MM'
  date: string;           // 'YYYY-MM-DD'
  dayOfWeek: string;      // '월'~'일'
  isHoliday: boolean;
}

export type ReservationType = 'class' | 'event' | 'self-study';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Reservation {
  id: string;
  date: string;
  periodId: string;
  type: ReservationType;
  teacherId: string;
  className: string;
  grade: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Seat {
  id: string;
  row: number;
  col: number;
  label: string;
  isActive: boolean;
}

export interface SeatReservation {
  id: string;
  date: string;
  seatId: string;
  studentId: string;
  purpose: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface Schedule {
  id: string;
  dayOfWeek: string;
  periodId: string;
  type: ReservationType;
  assignedTo: string;
  description: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'reserved' | 'conflict' | 'negotiation_complete';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthPayload {
  userId: string;
  role: UserRole;
  name: string;
}
