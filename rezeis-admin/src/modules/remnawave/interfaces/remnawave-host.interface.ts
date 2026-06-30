export interface RemnawaveHostInterface {
  readonly uuid: string;
  readonly viewPosition: number;
  readonly remark: string;
  readonly address: string;
  readonly port: number;
  readonly isDisabled: boolean;
  readonly isHidden: boolean;
  readonly securityLayer: string;
  readonly tag: string | null;
  /**
   * 2.8 replaced the single `tag` string with a `tags` array. We normalize to
   * an array for both versions (legacy `tag` → `[tag]`), keeping `tag` as the
   * first element for back-compat.
   */
  readonly tags: readonly string[];
  readonly configProfileUuid: string | null;
  readonly configProfileInboundUuid: string | null;
  readonly nodes: readonly string[];
}
