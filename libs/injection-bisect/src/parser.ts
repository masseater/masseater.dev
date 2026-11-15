import type { Effect } from "effect";

import type { ReadError } from "./read-error.ts";

export interface Span {
  readonly start: number;
  readonly end: number;
}

export type Unit =
  | (Span & { readonly kind: "prose" })
  | (Span & { readonly kind: "whole" })
  | (Span & { readonly kind: "nested"; readonly format: string });

export interface Parser {
  readonly format: string;
  readonly extensions: readonly string[];
  readonly aliases?: readonly string[];
  readonly accepts: (text: string) => boolean;
  readonly unitsOf: (text: string) => readonly Unit[];
}

export interface Unreadable {
  readonly name: string;
  readonly reason: string;
}

export interface Document {
  readonly text: string;
  readonly format: string;
  readonly unreadable?: readonly Unreadable[];
}

export interface Reader {
  readonly format: string;
  readonly extensions: readonly string[];
  readonly accepts?: (bytes: Uint8Array) => boolean;
  readonly read: (bytes: Uint8Array) => Effect.Effect<Document, ReadError>;
}
