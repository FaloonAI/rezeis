/**
 * Error-report archive (filesystem, bounded)
 * ───────────────────────────────────────────
 * When the operator picks the `auto` error-report mode, every new ERROR
 * system event is written as a `.txt` file under
 *   <baseDir>/<YYYY-MM-DD>/error_<id|stamp>.txt
 *
 * Hardening (a crash loop must never fill the disk):
 *   - retention: date folders older than `retentionDays` are pruned.
 *   - per-process rate cap: at most `maxPerMinute` files written per rolling
 *     minute (extra errors are dropped from the archive — they still persist
 *     to the audit log + realtime stream).
 *   - best-effort: every fs op is wrapped; failures are swallowed and
 *     surfaced to the caller's logger via the returned reason, never thrown.
 */
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface ArchiveResult {
  readonly written: boolean;
  /** Absolute path of the written file (when `written`). */
  readonly filePath?: string;
  /** Why the write was skipped/failed (when not `written`). */
  readonly reason?: string;
}

const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_MAX_PER_MINUTE = 60;

let windowStart = Date.now();
let windowCount = 0;

/** Resolve the archive base directory (env override → `data/error-reports`). */
export function resolveErrorReportsDir(): string {
  const override = (process.env.ERROR_REPORTS_DIR ?? '').trim();
  if (override.length > 0) return override;
  return path.join(process.cwd(), 'data', 'error-reports');
}

function dayFolder(timestamp: string): string {
  const d = new Date(timestamp);
  const iso = Number.isNaN(d.getTime()) ? new Date() : d;
  return iso.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function writeErrorReport(input: {
  readonly baseDir: string;
  readonly filename: string;
  readonly content: string;
  readonly timestamp: string;
  readonly retentionDays?: number;
  readonly maxPerMinute?: number;
}): Promise<ArchiveResult> {
  const maxPerMinute = input.maxPerMinute ?? DEFAULT_MAX_PER_MINUTE;

  // Rolling per-minute cap.
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= maxPerMinute) {
    return { written: false, reason: 'rate-capped' };
  }
  windowCount += 1;

  try {
    const folder = path.join(input.baseDir, dayFolder(input.timestamp));
    await fs.mkdir(folder, { recursive: true });
    const filePath = path.join(folder, sanitizeName(input.filename));
    await fs.writeFile(filePath, input.content, 'utf8');
    // Prune old folders after a successful write (best-effort, non-blocking).
    void pruneOldFolders(input.baseDir, input.retentionDays ?? DEFAULT_RETENTION_DAYS).catch(
      () => undefined,
    );
    return { written: true, filePath };
  } catch (err: unknown) {
    return { written: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 96) || 'error.txt';
}

async function pruneOldFolders(baseDir: string, retentionDays: number): Promise<void> {
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) continue;
    const folderTime = new Date(`${entry.name}T00:00:00Z`).getTime();
    if (Number.isNaN(folderTime) || folderTime >= cutoff) continue;
    await fs.rm(path.join(baseDir, entry.name), { recursive: true, force: true }).catch(
      () => undefined,
    );
  }
}
