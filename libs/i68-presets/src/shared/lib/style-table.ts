export type Transitions = Readonly<Record<string, Readonly<Record<string, number>>>>;

export interface StyleTable {
  readonly name: string;
  readonly source: string;
  readonly order: number;
  readonly transitions: Transitions;
}
