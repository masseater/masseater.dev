import { Schema } from "effect";

export const TextSearch = Schema.Struct({ keyword: Schema.optional(Schema.String) });

export type TextFilter = typeof TextSearch.Type;
