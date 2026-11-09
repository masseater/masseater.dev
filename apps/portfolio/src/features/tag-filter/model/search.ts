import { Option, Schema } from "effect";

const SearchSchema = Schema.Struct({ tag: Schema.optionalKey(Schema.String) });

type TagSearch = typeof SearchSchema.Type;

const decodeSearch = Schema.decodeUnknownOption(SearchSchema);

const allTags: TagSearch = {};

const validateTagSearch = (search: unknown): TagSearch =>
  Option.getOrElse(decodeSearch(search), () => allTags);

export type { TagSearch };
export { allTags, validateTagSearch };
