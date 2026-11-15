import { Schema, String as Str } from "effect";
import type { Effect } from "effect";

interface FoundComment {
  readonly index: number;
  readonly text: string;
}

type Found = Effect.Effect<readonly FoundComment[], CommentsUnreadable>;

const taggedError = Schema.TaggedError;

class CommentsUnreadable extends taggedError<
  CommentsUnreadable,
  { readonly brand: unique symbol }
>()("CommentsUnreadable", { reader: Schema.String, message: Schema.String }) {}

const unreadable =
  (reader: string) =>
  (cause: unknown): CommentsUnreadable =>
    CommentsUnreadable.make({ reader, message: String(cause) });

const trimmed = ({ index, text }: FoundComment): FoundComment => ({
  index,
  text: Str.trimEnd(text),
});

export { CommentsUnreadable, trimmed, unreadable };
export type { Found, FoundComment };
