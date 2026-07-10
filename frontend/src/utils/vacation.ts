import { Family } from '../types';

/**
 * Date-aware check: vacation mode is active only when today falls within the
 * configured start–end range. If vacation is on but no dates are set, it is
 * treated as active every day.
 */
export function isVacationActive(family?: Partial<Family> | null): boolean {
  if (!family || !family.vacation_mode) return false;
  const start = family.vacation_start_date;
  const end = family.vacation_end_date;
  if (start && end) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return today >= start && today <= end;
  }
  return true;
}
