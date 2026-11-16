import { Schema } from "effect";
import type { Option } from "effect";

const taggedError = Schema.TaggedError;

export class UnsupportedSchema extends taggedError<
  UnsupportedSchema,
  { readonly brand: unique symbol }
>()("UnsupportedSchema", { path: Schema.String, reason: Schema.String }) {}

export interface Prim {
  readonly _tag: "Prim";
  readonly name: string;
}

export interface Json {
  readonly _tag: "Json";
}

export interface Named {
  readonly _tag: "Named";
  readonly name: string;
}

export interface Optional {
  readonly _tag: "Optional";
  readonly of: Ty;
}

export interface List {
  readonly _tag: "List";
  readonly of: Ty;
}

export interface Dictionary {
  readonly _tag: "Dictionary";
  readonly key: Ty;
  readonly value: Ty;
}

export interface Tuple {
  readonly _tag: "Tuple";
  readonly items: readonly Ty[];
}

export interface Boxed {
  readonly _tag: "Boxed";
  readonly of: Ty;
}

export type Ty = Prim | Json | Named | Optional | List | Dictionary | Tuple | Boxed;

export interface Field {
  readonly rust: string;
  readonly key: string;
  readonly ty: Ty;
  readonly skipNone: boolean;
  readonly doc: Option.Option<string>;
}

export interface Variant {
  readonly value: string;
  readonly doc: Option.Option<string>;
  readonly fields: readonly Field[];
}

export interface Struct {
  readonly _tag: "Struct";
  readonly name: string;
  readonly doc: Option.Option<string>;
  readonly fields: readonly Field[];
}

export interface Enumeration {
  readonly _tag: "Enumeration";
  readonly name: string;
  readonly doc: Option.Option<string>;
  readonly values: readonly string[];
}

export interface Tagged {
  readonly _tag: "Tagged";
  readonly name: string;
  readonly doc: Option.Option<string>;
  readonly tag: string;
  readonly variants: readonly Variant[];
}

export interface Alias {
  readonly _tag: "Alias";
  readonly name: string;
  readonly doc: Option.Option<string>;
  readonly ty: Ty;
}

export type Item = Struct | Enumeration | Tagged | Alias;

export interface Constant {
  readonly name: string;
  readonly value: string | number | boolean;
}

export const prim = (name: string): Ty => ({ _tag: "Prim", name });

export const json: Ty = { _tag: "Json" };

export const named = (name: string): Ty => ({ _tag: "Named", name });

export const optional = (of: Ty): Ty => ({ _tag: "Optional", of });

export const list = (of: Ty): Ty => ({ _tag: "List", of });

export const dictionary = ([key, value]: readonly [Ty, Ty]): Ty => ({
  _tag: "Dictionary",
  key,
  value,
});

export const tuple = (items: readonly Ty[]): Ty => ({ _tag: "Tuple", items });

export const boxed = (of: Ty): Ty => ({ _tag: "Boxed", of });
