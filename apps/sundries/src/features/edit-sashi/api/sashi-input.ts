import { KindSchema } from "@masseater.dev/sashi";
import { Schema } from "effect";

const Query = Schema.NonEmptyString.annotate({
  description: "Words to find in the title, note or tags",
});

export const ListInput = Schema.Struct({
  kind: Schema.optionalKey(KindSchema),
  query: Schema.optionalKey(Query),
});
