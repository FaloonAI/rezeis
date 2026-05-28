import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BotButtonAction, BotButtonStyle } from '@prisma/client';

const BUTTON_STYLES: ReadonlyArray<BotButtonStyle> = [
  BotButtonStyle.PRIMARY,
  BotButtonStyle.SUCCESS,
  BotButtonStyle.DANGER,
  BotButtonStyle.DEFAULT,
];

const BUTTON_ACTIONS: ReadonlyArray<BotButtonAction> = [
  BotButtonAction.CALLBACK,
  BotButtonAction.URL,
  BotButtonAction.WEBAPP,
  BotButtonAction.SCREEN,
  BotButtonAction.SUPPORT_URL,
];

/**
 * The frontend sends button styles in lower case (`primary`, `success`, …)
 * for friendliness. The DTO accepts either case and the controller upcases
 * before persisting.
 */
export class CreateBotButtonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public readonly buttonId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  public readonly label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly iconCustomEmojiId?: string | null;

  @IsOptional()
  @IsBoolean()
  public readonly visible?: boolean;

  @IsOptional()
  @IsBoolean()
  public readonly onePerRow?: boolean;

  @IsOptional()
  @IsInt()
  public readonly orderIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly actionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  public readonly actionTarget?: string | null;
}

export class UpdateBotButtonDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly iconCustomEmojiId?: string | null;

  @IsOptional()
  @IsBoolean()
  public readonly visible?: boolean;

  @IsOptional()
  @IsBoolean()
  public readonly onePerRow?: boolean;

  @IsOptional()
  @IsInt()
  public readonly orderIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly actionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  public readonly actionTarget?: string | null;
}

export function parseBotButtonStyle(value: unknown): BotButtonStyle | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const normalised = value.toUpperCase();
  return BUTTON_STYLES.find((style) => style === normalised);
}

export function parseBotButtonAction(value: unknown): BotButtonAction | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const normalised = value.toUpperCase();
  return BUTTON_ACTIONS.find((action) => action === normalised);
}

/**
 * Body for `POST /admin/bot-config/buttons/reorder`. Frontend ships the
 * complete list of button ids in the desired display order; backend
 * normalises `orderIndex` to 0..N-1 in a single transaction.
 */
export class ReorderBotButtonsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @IsString({ each: true })
  public readonly ids!: string[];
}

export class CreateBotEmojiDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public readonly key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(16)
  public readonly unicode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly tgEmojiId?: string | null;
}

export class UpdateBotEmojiDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public readonly key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  public readonly unicode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  public readonly tgEmojiId?: string | null;
}

export class CreateBotTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  public readonly key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8_000)
  public readonly value!: string;

  @IsOptional()
  @IsBoolean()
  public readonly visible?: boolean;
}

export class UpdateBotTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  public readonly key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8_000)
  public readonly value?: string;

  @IsOptional()
  @IsBoolean()
  public readonly visible?: boolean;
}
