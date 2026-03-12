/**
 * Bangladesh Public Holidays (Government Gazette)
 * Covers 2025–2027. Dates for Islamic holidays are approximate
 * and may shift by ±1 day based on moon sighting.
 */

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'national' | 'religious' | 'cultural';
}

const HOLIDAYS: PublicHoliday[] = [
  // ── 2025 ──
  { date: '2025-02-21', name: 'International Mother Language Day', type: 'national' },
  { date: '2025-03-17', name: 'Birthday of Bangabandhu', type: 'national' },
  { date: '2025-03-26', name: 'Independence Day', type: 'national' },
  { date: '2025-03-31', name: 'Shab-e-Meraj', type: 'religious' },
  { date: '2025-04-14', name: 'Pohela Boishakh', type: 'cultural' },
  { date: '2025-05-01', name: 'May Day', type: 'national' },
  { date: '2025-05-12', name: 'Buddha Purnima', type: 'religious' },
  { date: '2025-03-14', name: 'Shab-e-Barat', type: 'religious' },
  { date: '2025-03-30', name: 'Eid-ul-Fitr ☪', type: 'religious' },
  { date: '2025-03-31', name: 'Eid-ul-Fitr (2nd day) ☪', type: 'religious' },
  { date: '2025-04-01', name: 'Eid-ul-Fitr (3rd day) ☪', type: 'religious' },
  { date: '2025-06-06', name: 'Eid-ul-Adha ☪', type: 'religious' },
  { date: '2025-06-07', name: 'Eid-ul-Adha (2nd day) ☪', type: 'religious' },
  { date: '2025-06-08', name: 'Eid-ul-Adha (3rd day) ☪', type: 'religious' },
  { date: '2025-07-06', name: 'Muharram (Ashura)', type: 'religious' },
  { date: '2025-08-15', name: 'National Mourning Day', type: 'national' },
  { date: '2025-08-16', name: 'Janmashtami', type: 'religious' },
  { date: '2025-09-05', name: 'Eid-e-Milad-un-Nabi', type: 'religious' },
  { date: '2025-10-02', name: 'Durga Puja (Bijaya Dashami)', type: 'religious' },
  { date: '2025-12-16', name: 'Victory Day', type: 'national' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'religious' },

  // ── 2026 ──
  { date: '2026-02-21', name: 'International Mother Language Day', type: 'national' },
  { date: '2026-03-17', name: 'Birthday of Bangabandhu', type: 'national' },
  { date: '2026-03-20', name: 'Eid-ul-Fitr ☪', type: 'religious' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr (2nd day) ☪', type: 'religious' },
  { date: '2026-03-22', name: 'Eid-ul-Fitr (3rd day) ☪', type: 'religious' },
  { date: '2026-03-26', name: 'Independence Day', type: 'national' },
  { date: '2026-04-14', name: 'Pohela Boishakh', type: 'cultural' },
  { date: '2026-05-01', name: 'May Day', type: 'national' },
  { date: '2026-05-02', name: 'Buddha Purnima', type: 'religious' },
  { date: '2026-05-27', name: 'Eid-ul-Adha', type: 'religious' },
  { date: '2026-05-28', name: 'Eid-ul-Adha (2nd day)', type: 'religious' },
  { date: '2026-05-29', name: 'Eid-ul-Adha (3rd day)', type: 'religious' },
  { date: '2026-06-26', name: 'Muharram (Ashura)', type: 'religious' },
  { date: '2026-08-05', name: 'Janmashtami', type: 'religious' },
  { date: '2026-08-15', name: 'National Mourning Day', type: 'national' },
  { date: '2026-08-26', name: 'Eid-e-Milad-un-Nabi', type: 'religious' },
  { date: '2026-09-21', name: 'Durga Puja (Bijaya Dashami)', type: 'religious' },
  { date: '2026-12-16', name: 'Victory Day', type: 'national' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'religious' },

  // ── 2027 ──
  { date: '2027-02-21', name: 'International Mother Language Day', type: 'national' },
  { date: '2027-03-10', name: 'Eid-ul-Fitr', type: 'religious' },
  { date: '2027-03-11', name: 'Eid-ul-Fitr (2nd day)', type: 'religious' },
  { date: '2027-03-12', name: 'Eid-ul-Fitr (3rd day)', type: 'religious' },
  { date: '2027-03-17', name: 'Birthday of Bangabandhu', type: 'national' },
  { date: '2027-03-26', name: 'Independence Day', type: 'national' },
  { date: '2027-04-14', name: 'Pohela Boishakh', type: 'cultural' },
  { date: '2027-05-01', name: 'May Day', type: 'national' },
  { date: '2027-05-17', name: 'Eid-ul-Adha', type: 'religious' },
  { date: '2027-05-18', name: 'Eid-ul-Adha (2nd day)', type: 'religious' },
  { date: '2027-05-19', name: 'Eid-ul-Adha (3rd day)', type: 'religious' },
  { date: '2027-05-21', name: 'Buddha Purnima', type: 'religious' },
  { date: '2027-06-16', name: 'Muharram (Ashura)', type: 'religious' },
  { date: '2027-07-26', name: 'Janmashtami', type: 'religious' },
  { date: '2027-08-15', name: 'National Mourning Day', type: 'national' },
  { date: '2027-08-16', name: 'Eid-e-Milad-un-Nabi', type: 'religious' },
  { date: '2027-10-10', name: 'Durga Puja (Bijaya Dashami)', type: 'religious' },
  { date: '2027-12-16', name: 'Victory Day', type: 'national' },
  { date: '2027-12-25', name: 'Christmas Day', type: 'religious' },
];

/** Get holidays for a specific month (0-indexed) and year */
export function getHolidaysForMonth(year: number, month: number): PublicHoliday[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return HOLIDAYS.filter(h => h.date.startsWith(prefix));
}

/** Check if a specific date is a holiday */
export function getHolidayForDate(dateKey: string): PublicHoliday | undefined {
  return HOLIDAYS.find(h => h.date === dateKey);
}
