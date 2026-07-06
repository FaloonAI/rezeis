import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { SubpageCacheInvalidatorService } from '../services/subpage-cache-invalidator.service';

/**
 * SubpageCacheInvalidateInterceptor
 * ─────────────────────────────────
 * Fires a fire-and-forget cache-bust to rezeis-subpage after any successful
 * mutation (non-GET 2xx). Apply on the admin controller class. Mirrors
 * ReiwaCacheInvalidateInterceptor — the invalidate never blocks or fails the
 * admin response.
 */
@Injectable()
export class SubpageCacheInvalidateInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SubpageCacheInvalidateInterceptor.name);

  public constructor(private readonly invalidator: SubpageCacheInvalidatorService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      route?: { path?: string };
      url?: string;
    }>();
    const method = (request.method ?? 'GET').toUpperCase();
    const isMutation = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

    if (!isMutation) {
      return next.handle();
    }

    const reason = `${method} ${request.route?.path ?? request.url ?? '?'}`;

    return next.handle().pipe(
      tap({
        next: () => {
          this.invalidator.invalidate(reason).catch((err: unknown) => {
            this.logger.warn(
              `invalidate threw post-handler: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        },
      }),
    );
  }
}
