import { Effect } from "effect";
import { constVoid } from "effect/Function";
import { MultipartParser } from "effect/http";

import { Malformed } from "./malformed.ts";

export interface Part {
  readonly name: string;
  readonly chunks: readonly Uint8Array[];
}

interface Collected {
  readonly parts: Part[];
  failed: boolean;
}

const CONTENT_TYPE = "content-type";

const collect = (contentType: string, body: Uint8Array): Collected => {
  const collected: Collected = { parts: [], failed: false };
  const parser = MultipartParser.make({
    headers: { [CONTENT_TYPE]: contentType },
    isFile: () => true,
    onFile: (info): ((chunk: Uint8Array | null) => void) => {
      const chunks: Uint8Array[] = [];
      collected.parts.push({ name: info.name, chunks });
      return (chunk) => {
        if (chunk !== null) {
          chunks.push(chunk);
        }
      };
    },
    onField: constVoid,
    onError: () => {
      collected.failed = true;
    },
    onDone: constVoid,
  });
  parser.write(body);
  parser.end();
  return collected;
};

export const partsOf = Effect.fn("multipart.partsOf")(function* partsOf(
  contentType: string,
  body: Uint8Array,
) {
  const collected = yield* Effect.sync(() => collect(contentType, body));
  if (collected.failed) {
    return yield* Malformed.make({ reason: "multipart body" });
  }
  const parts: readonly Part[] = collected.parts;
  return parts;
});
