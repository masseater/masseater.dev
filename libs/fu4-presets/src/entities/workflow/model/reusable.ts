export type CallInputKind = "any" | "boolean" | "number" | "string";

export interface CallInput {
  readonly name: string;
  readonly required: boolean;
  readonly kind: CallInputKind;
}

export interface CallSecret {
  readonly name: string;
  readonly required: boolean;
}

export interface ReusableMetadata {
  readonly inputs: Readonly<Record<string, CallInput>>;
  readonly outputs: Readonly<Record<string, string>>;
  readonly secrets: Readonly<Record<string, CallSecret>>;
}

export const EMPTY_METADATA: ReusableMetadata = { inputs: {}, outputs: {}, secrets: {} };
