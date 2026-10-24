import { Option, Schema } from "effect";

const SearchSchema = Schema.Struct({ tag: Schema.optionalKey(Schema.String) });

type CollectionSearch = typeof SearchSchema.Type;

const decodeSearch = Schema.decodeUnknownOption(SearchSchema);

const allTags: CollectionSearch = {};

const validateCollectionSearch = (search: unknown): CollectionSearch =>
  Option.getOrElse(decodeSearch(search), () => allTags);

export type { CollectionSearch };
export { allTags, validateCollectionSearch };
