import type { Document, ReadInput } from "@r_masseater/injection-bisect";
import { Effect } from "effect";

const decoder = new TextDecoder();

const AUTO = "auto";

const DEFAULT_MODEL = "test/model";

const PRODUCT_NAME = "injection-bisect";

const DEFAULT_READERS: readonly never[] = [];

const readDocument = ({ bytes }: ReadInput): Effect.Effect<Document> =>
  Effect.succeed({ text: decoder.decode(bytes), format: "plain" });

export { AUTO, DEFAULT_MODEL, DEFAULT_READERS, PRODUCT_NAME, readDocument };
