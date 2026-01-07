import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export type FeeTier = { minutes: number; price: number };
export type FeesConfig = {
  perHour?: { [fieldType: string]: number };
  tiers?: { [fieldType: string]: FeeTier[] };
};

export type GeneralSettings = {
  adminEmails?: string[];
  workingHours?: { start: string; end: string };
  minimumBookingDuration?: number;
  advanceBookingDays?: number;
  autoApprove?: boolean;
  fees?: FeesConfig;
};

export async function getGeneralSettings(): Promise<GeneralSettings | null> {
  const ref = doc(db, 'settings', 'general');
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as GeneralSettings;
}

export function estimateFee(
  settings: GeneralSettings | null,
  fieldType: string,
  durationMinutes: number
): number | null {
  if (!settings || !settings.fees) return null;
  const fees = settings.fees;
  // Tiers mają priorytet
  const tiers = fees.tiers?.[fieldType];
  if (tiers && tiers.length) {
    // znajdź pierwszy tier o minutes >= durationMinutes, inaczej ostatni
    const sorted = [...tiers].sort((a, b) => a.minutes - b.minutes);
    for (const t of sorted) {
      if (durationMinutes <= t.minutes) return t.price;
    }
    return sorted[sorted.length - 1].price;
  }
  // perHour fallback
  const perHour = fees.perHour?.[fieldType];
  if (perHour && perHour > 0) {
    return Math.round((perHour * durationMinutes) / 60);
  }
  return null;
}

export async function updateGeneralSettings(patch: Partial<GeneralSettings>) {
  const ref = doc(db, 'settings', 'general');
  const { setDoc } = await import('firebase/firestore');
  await setDoc(ref, patch, { merge: true });
}

export function isWithinWorkingHours(
  workingHours: { start: string; end: string } | undefined,
  startTime: string,
  endTime: string
): boolean {
  if (!workingHours) return true;
  const ws = toMinutes(workingHours.start);
  const we = toMinutes(workingHours.end);
  const s = toMinutes(startTime);
  const e = toMinutes(endTime);
  return s >= ws && e <= we && e > s;
}

export function isWithinAdvanceDays(
  advanceBookingDays: number | undefined,
  dateStr: string
): boolean {
  if (!advanceBookingDays || advanceBookingDays <= 0) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const max = new Date(today);
  max.setDate(today.getDate() + advanceBookingDays);
  return target <= max;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return h * 60 + m;
}
