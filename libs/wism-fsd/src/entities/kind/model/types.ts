export interface Placement {
  readonly files: readonly string[];
  readonly allow: readonly string[];
  readonly message?: string;
}

export interface Layers {
  readonly dir: string;
  readonly files: readonly string[];
  readonly order: readonly string[];
  readonly sliced?: readonly string[];
  readonly segmented?: readonly string[];
  readonly loose?: readonly string[];
  readonly entries?: readonly string[];
  readonly open?: readonly string[];
  readonly moduleFiles?: boolean;
  readonly cross?: string;
}

export interface Kind {
  readonly name: string;
  readonly marker: string;
  readonly paths?: readonly string[];
  readonly placements?: readonly Placement[];
  readonly layers?: Layers;
}
