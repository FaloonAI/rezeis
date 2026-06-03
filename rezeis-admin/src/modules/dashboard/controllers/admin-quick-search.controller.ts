import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdminInterface } from '../../auth/interfaces/current-admin.interface';
import { QuickSearchQueryDto } from '../dto/quick-search-query.dto';
import { QuickSearchHitInterface } from '../interfaces/quick-search-result.interface';
import { QuickSearchService } from '../services/quick-search.service';

/**
 * Backs the Cmd+K overlay rendered in `quick-search-overlay.tsx`.
 *
 * Mounted under `/admin/quick-search` so the existing frontend client
 * (`api.get('/admin/quick-search')`) keeps working without changes.
 */
@ApiTags('admin/quick-search')
@ApiBearerAuth('JWT')
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/quick-search')
export class AdminQuickSearchController {
  public constructor(private readonly quickSearchService: QuickSearchService) {}

  @Get()
  @ApiOperation({ summary: 'Cross-domain admin search for the Cmd+K overlay' })
  @ApiOkResponse({ description: 'List of mixed-domain hits, capped at `limit`' })
  public search(
    @Query() query: QuickSearchQueryDto,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<QuickSearchHitInterface[]> {
    return this.quickSearchService.search({
      rawQuery: query.q,
      limit: query.limit,
      currentAdmin,
    });
  }
}
