import { ArrayNotEmpty, IsArray, IsString, MaxLength } from 'class-validator';

/**
 * Bulk plan reorder payload. `orderedIds` is the full list of plan ids in the
 * desired display order (index 0 → shown first in the cabinet). The service
 * writes each plan's `orderIndex` to its position in this array.
 */
export class ReorderPlansDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  public orderedIds!: string[];
}
