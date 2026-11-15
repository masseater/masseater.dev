import { Option, Schema } from "effect";

const SearchSchema = Schema.Struct({ tag: Schema.optionalKey(Schema.String) });

export type TagSearch = typeof SearchSchema.Type;

const decodeSearch = Schema.decodeUnknownOption(SearchSchema);

export const allTags: TagSearch = {};

export const validateTagSearch = (search: unknown): TagSearch =>
  Option.getOrElse(decodeSearch(search), () => allTags);
