import type { Document, ReadInput } from "@r_masseater/injection-bisect";
import { Effect } from "effect";

const decoder = new TextDecoder();

export const AUTO = "auto";

export const DEFAULT_MODEL = "test/model";

export const PRODUCT_NAME = "injection-bisect";

export const DEFAULT_READERS: readonly never[] = [];

export const readDocument = ({ bytes }: ReadInput): Effect.Effect<Document> =>
  Effect.succeed({ text: decoder.decode(bytes), format: "plain" });
