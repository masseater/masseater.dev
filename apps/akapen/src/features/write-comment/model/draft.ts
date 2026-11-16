import { runtime } from "@masseater.dev/media-notes-ui";
import { Schema } from "effect";
import { Atom } from "effect/reactivity";

const EMPTY = "";

/** @internal */
export const wordsAtom = Atom.kvs({
  runtime,
  key: "akapen/draft-words",
  schema: Schema.String,
  defaultValue: () => EMPTY,
}).pipe(Atom.keepAlive);
