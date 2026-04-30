'use client';
import { useState, useEffect, useCallback } from 'react';
import type { TimetableDay, Period, Reservation } from '@/types';

export function useTimetable(month: string) {
  const [days, setDays] = useState<TimetableDay[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [daysRes, periodsRes, reservationsRes] = await Promise.all([
      fetch(`/api/timetable?month=${month}`).then(r => r.json()),
      fetch('/api/periods').then(r => r.json()),
      fetch(`/api/reservations?month=${month}`).then(r => r.json()),
    ]);
    setDays(daysRes);
    setPeriods(periodsRes);
    setReservations(reservationsRes);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function getReservation(date: string, periodId: string) {
    return reservations.find(r => r.date === date && r.periodId === periodId);
  }

  return { days, periods, reservations, loading, getReservation, reload: fetchData };
}
