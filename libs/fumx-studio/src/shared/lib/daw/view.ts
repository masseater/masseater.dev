export interface Lane {
  readonly values: ArrayLike<number>;
  readonly low: number;
  readonly high: number;
  readonly log?: number;
  readonly unit: string;
}

export interface View {
  readonly auto?: Readonly<Record<string, Lane>>;
  readonly roots?: readonly number[];
}
