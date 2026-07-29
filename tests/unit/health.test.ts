import { describe, expect, it } from "vitest";
import { MAX_BACKUP_AGE_MS, isBackupFresh } from "@/lib/health";

describe("backup health", () => {
  const now = Date.UTC(2026, 6, 28, 12, 0, 0);

  it("accepts a recent backup and rejects stale or invalid timestamps", () => {
    expect(isBackupFresh((now - MAX_BACKUP_AGE_MS + 1_000) / 1000, now)).toBe(true);
    expect(isBackupFresh((now - MAX_BACKUP_AGE_MS - 1_000) / 1000, now)).toBe(false);
    expect(isBackupFresh(Number.NaN, now)).toBe(false);
    expect(isBackupFresh((now + 10 * 60 * 1000) / 1000, now)).toBe(false);
  });
});
