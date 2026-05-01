export function getCurrentKSTDate(): string {
  // KST = UTC+9
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

export function getCurrentKSTTime(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[1].substring(0, 5); // 'HH:mm'
}

export function isStudentReservationAllowed(): boolean {
  const time = getCurrentKSTTime();
  return time >= '07:00' && time <= '13:10';
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getDayOfWeekKor(date: Date): string {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}
