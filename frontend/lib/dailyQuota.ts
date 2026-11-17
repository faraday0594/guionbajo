export const DAILY_FREE_CLASS_LIMIT = 2;
const STORAGE_KEY = 'guionbajo_daily_quota';
const EMAIL_KEY = 'guionbajo_user_email';

export interface DailyQuotaState {
  daily_limit: number | null;
  daily_used: number;
  daily_remaining: number;
  daily_started_keys: string[];
  daily_completed_keys: string[];
  is_unlimited: boolean;
  date: string;
}

export function getTodayLocalStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function setStoredUserEmail(email: string): void {
  if (typeof window === 'undefined' || !email) return;
  try {
    localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  } catch (_) {}
}

export function getStoredUserEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return (localStorage.getItem(EMAIL_KEY) || '').trim().toLowerCase();
  } catch (_) {
    return '';
  }
}

export function isUnlimitedUser(email?: string): boolean {
  const target = (email || getStoredUserEmail()).trim().toLowerCase();
  return target === 'megafer1994@gmail.com';
}

export function getLocalDailyQuota(userEmail?: string): DailyQuotaState {
  const today = getTodayLocalStr();
  const unlimited = isUnlimitedUser(userEmail);

  let started: string[] = [];
  let completed: string[] = [];

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === today) {
          started = Array.isArray(parsed.started_keys) ? parsed.started_keys : [];
          completed = Array.isArray(parsed.completed_keys) ? parsed.completed_keys : [];
        }
      }
    } catch (_) {}
  }

  const used = started.length;
  const remaining = unlimited ? 999 : Math.max(0, DAILY_FREE_CLASS_LIMIT - used);

  return {
    daily_limit: unlimited ? null : DAILY_FREE_CLASS_LIMIT,
    daily_used: used,
    daily_remaining: remaining,
    daily_started_keys: started,
    daily_completed_keys: completed,
    is_unlimited: unlimited,
    date: today,
  };
}

function saveLocalDailyQuota(started: string[], completed: string[], userEmail?: string): DailyQuotaState {
  const today = getTodayLocalStr();
  const uniqueStarted = Array.from(new Set(started));
  const uniqueCompleted = Array.from(new Set(completed));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          date: today,
          started_keys: uniqueStarted,
          completed_keys: uniqueCompleted,
        })
      );
    } catch (_) {}
  }

  return getLocalDailyQuota(userEmail);
}

export function syncDailyQuotaFromServer(serverQuota: any, userEmail?: string): DailyQuotaState {
  const local = getLocalDailyQuota(userEmail);
  if (!serverQuota || typeof serverQuota !== 'object') {
    return local;
  }

  const srvStarted = Array.isArray(serverQuota.daily_started_keys) ? serverQuota.daily_started_keys : [];
  const srvCompleted = Array.isArray(serverQuota.daily_completed_keys) ? serverQuota.daily_completed_keys : [];

  const mergedStarted = Array.from(new Set([...local.daily_started_keys, ...srvStarted]));
  const mergedCompleted = Array.from(new Set([...local.daily_completed_keys, ...srvCompleted]));

  return saveLocalDailyQuota(mergedStarted, mergedCompleted, userEmail);
}

export function canStartOrContinueClass(
  sublevel: string,
  classIndex: number,
  userEmail?: string
): { allowed: boolean; isAlreadyStartedToday: boolean; quota: DailyQuotaState } {
  const quota = getLocalDailyQuota(userEmail);
  const key = `${sublevel || 'A1.1'}:${Number(classIndex) || 1}`;

  if (quota.is_unlimited) {
    return { allowed: true, isAlreadyStartedToday: true, quota };
  }

  if (quota.daily_started_keys.includes(key)) {
    return { allowed: true, isAlreadyStartedToday: true, quota };
  }

  if (quota.daily_started_keys.length < DAILY_FREE_CLASS_LIMIT) {
    return { allowed: true, isAlreadyStartedToday: false, quota };
  }

  return { allowed: false, isAlreadyStartedToday: false, quota };
}

export function recordClassStartedLocal(
  sublevel: string,
  classIndex: number,
  userEmail?: string
): DailyQuotaState {
  const quota = getLocalDailyQuota(userEmail);
  const key = `${sublevel || 'A1.1'}:${Number(classIndex) || 1}`;
  if (!quota.daily_started_keys.includes(key)) {
    return saveLocalDailyQuota([...quota.daily_started_keys, key], quota.daily_completed_keys, userEmail);
  }
  return quota;
}

export function recordClassCompletedLocal(
  sublevel: string,
  classIndex: number,
  userEmail?: string
): DailyQuotaState {
  const quota = getLocalDailyQuota(userEmail);
  const key = `${sublevel || 'A1.1'}:${Number(classIndex) || 1}`;
  return saveLocalDailyQuota(
    [...quota.daily_started_keys, key],
    [...quota.daily_completed_keys, key],
    userEmail
  );
}
