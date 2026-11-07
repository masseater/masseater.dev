import { Schema } from "effect";

const TextSearch = Schema.Struct({ keyword: Schema.optional(Schema.String) });

type TextFilter = typeof TextSearch.Type;

export type { TextFilter };
export { TextSearch };
