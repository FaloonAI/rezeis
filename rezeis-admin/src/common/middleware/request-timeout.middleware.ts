import { Injectable, NestMiddleware, RequestTimeoutException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Global request timeout middleware.
 *
 * Aborts requests that exceed the configured timeout (default 30s).
 * Exceptions:
 *   - SSE streams (/internal/user/.../stream) - infinite timeout
 *   - File uploads (/admin/imports/..., /admin/broadcast/upload-media) - 120s
 *   - Backup download (/admin/backup/download/...) - 120s
 *
 * This prevents slow/hung requests from consuming worker threads
 * indefinitely and protects against slowloris-style attacks.
 */
const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

const LONG_TIMEOUT_PATTERNS = [
  /\/admin\/imports\//,
  /\/admin\/broadcast\/upload-media/,
  /\/admin\/backup\/download\//,
  /\/admin\/backup\/restore\//,
];

const INFINITE_TIMEOUT_PATTERNS = [
  /\/internal\/user\/\d+\/stream/,
  /\/realtime/,
];

@Injectable()
export class RequestTimeoutMiddleware implements NestMiddleware {
  public use(req: Request, res: Response, next: NextFunction): void {
    const path = req.originalUrl ?? req.url;

    // SSE/WebSocket streams — no timeout
    if (INFINITE_TIMEOUT_PATTERNS.some((p) => p.test(path))) {
      next();
      return;
    }

    // File uploads / downloads — extended timeout
    const timeout = LONG_TIMEOUT_PATTERNS.some((p) => p.test(path))
      ? UPLOAD_TIMEOUT_MS
      : DEFAULT_TIMEOUT_MS;

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const error = new RequestTimeoutException(
          `Request timed out after ${timeout}ms`,
        );
        res.status(408).json({
          statusCode: 408,
          message: error.message,
          error: 'Request Timeout',
        });
      }
    }, timeout);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  }
}
