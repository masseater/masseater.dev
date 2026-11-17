import { String as Str } from "effect";
import { Tag } from "liquidjs";
import type { Context, Emitter, Liquid } from "liquidjs";

export type Resolve = (path: string) => Promise<string>;

export type TagDefinition =
  Parameters<Liquid["registerTag"]> extends readonly [string, infer Definition]
    ? Definition
    : never;

export const dataTag = (resolve: Resolve): TagDefinition =>
  class Data extends Tag {
    public *render(_context: Context, emitter: Emitter): Generator<unknown, void, unknown> {
      const text: unknown = yield resolve(Str.trim(this.token.args));
      emitter.write(text);
    }
  };
