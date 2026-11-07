import type { Effect } from "effect";

import type { ReadError } from "./read-error.ts";

interface Span {
  readonly start: number;
  readonly end: number;
}

type Unit =
  | (Span & { readonly kind: "prose" })
  | (Span & { readonly kind: "whole" })
  | (Span & { readonly kind: "nested"; readonly format: string });

interface Parser {
  readonly format: string;
  readonly extensions: readonly string[];
  readonly aliases?: readonly string[];
  readonly accepts: (text: string) => boolean;
  readonly unitsOf: (text: string) => readonly Unit[];
}

interface Document {
  readonly text: string;
  readonly format: string;
}

interface Reader {
  readonly format: string;
  readonly extensions: readonly string[];
  readonly accepts?: (bytes: Uint8Array) => boolean;
  readonly read: (bytes: Uint8Array) => Effect.Effect<Document, ReadError>;
}

export type { Document, Parser, Reader, Span, Unit };
