export const MAX_BACKUP_AGE_MS = 26 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function isBackupFresh(timestampSeconds: number, now = Date.now()) {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return false;
  const age = now - timestampSeconds * 1000;
  return age >= -MAX_CLOCK_SKEW_MS && age <= MAX_BACKUP_AGE_MS;
}
