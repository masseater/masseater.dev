import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";

import { Embedder } from "#shared/embedding";
import type { LooseFile } from "#shared/unitypackage";

import {
  addFolderSource,
  countOf,
  embedderOf,
  indexInTemporaryFolder,
} from "./library.test.support.ts";
import { scanLibrary } from "./scan-library.ts";

const PACKAGE = "Cabin.unitypackage";
const NONE = 0;

const FILES: readonly LooseFile[] = [
  {
    guid: "0123456789abcdef0123456789abcdef",
    pathname: "Assets/Cabin/Textures/wall.png",
    data: new TextEncoder().encode("png"),
  },
  {
    guid: "fedcba9876543210fedcba9876543210",
    pathname: "Assets/Cabin/Textures/roof.png",
    data: new TextEncoder().encode("png"),
  },
];

const report = (): Effect.Effect<void> => Effect.void;

const downEmbedder = embedderOf({ embedDocuments: () => Effect.die("embedder is down") });

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "scanLibrary after a failed text embedding",
  (it) => {
    it.effect("埋め込みに失敗した文を、次の走査でやり直す", () =>
      Effect.gen(function* retriesTexts() {
        yield* addFolderSource(PACKAGE, FILES);
        const scan = scanLibrary({ linkBlm: Effect.void, report });
        yield* scan.pipe(Effect.provideService(Embedder, downEmbedder));
        const missing = yield* countOf("text_vectors");
        expect(missing).toStrictEqual([NONE]);
        yield* scan.pipe(Effect.provideService(Embedder, embedderOf({})));
        const embedded = yield* countOf("text_vectors");
        expect(embedded).toStrictEqual([FILES.length]);
      }).pipe(Effect.scoped),
    );
  },
);
