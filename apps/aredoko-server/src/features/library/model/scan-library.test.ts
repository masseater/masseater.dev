import { expect, layer } from "@effect/vitest";
import { Array, Effect, Option, String, pipe } from "effect";
import { HttpClient } from "effect/http";

import { Embedder } from "#shared/embedding";
import type { LooseFile } from "#shared/unitypackage";

import { Blm } from "./blm.ts";
import {
  addFolderSource,
  countOf,
  embedderOf,
  indexInTemporaryFolder,
  recordingEmbedder,
} from "./library.test.support.ts";
import { blmLinker } from "./link-blm.ts";
import { scanLibrary } from "./scan-library.ts";

const PACKAGE = "Cabin.unitypackage";
const NONE = 0;
const BLM_FOLDER = "a1b2";
const BOOTH_ID = 1_234_567;
const BOOTH_NAME = "山小屋セット";

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

const NO_BLM = { link: Effect.void, linkable: Effect.succeed((): boolean => false) };

const offline = HttpClient.make(() => Effect.die("offline"));

const ITEM = {
  folder: BLM_FOLDER,
  boothId: BOOTH_ID,
  name: Option.some(BOOTH_NAME),
  shop: Option.none(),
};

const namesBooth = String.includes(BOOTH_NAME);

const blmWith = (itemDirectory: string): typeof Blm.Service =>
  Blm.of({ library: Effect.succeedSome({ itemDirectory, items: [ITEM] }) });

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "scanLibrary after a failed text embedding",
  (it) => {
    it.effect("埋め込みに失敗した文を、次の走査でやり直す", () =>
      Effect.gen(function* retriesTexts() {
        yield* addFolderSource(PACKAGE, FILES);
        const scan = scanLibrary({ blm: NO_BLM, report });
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

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "scanLibrary of a package registered in BOOTH Library Manager",
  (it) => {
    it.effect("BOOTH の商品名を足した文を 1 回だけ埋め込む", () =>
      Effect.gen(function* embedsOnce() {
        const path = `${BLM_FOLDER}/${PACKAGE}`;
        const folder = yield* addFolderSource(path, FILES);
        const { embedder, texts } = yield* recordingEmbedder;
        const blm = yield* blmLinker;
        yield* scanLibrary({ blm, report }).pipe(
          Effect.provideService(Embedder, embedder),
          Effect.provideService(Blm, blmWith(folder)),
          Effect.provideService(HttpClient.HttpClient, offline),
        );
        const embedded = yield* texts;
        expect(embedded).toHaveLength(FILES.length);
        expect(pipe(embedded, Array.every(namesBooth))).toBe(true);
        const vectors = yield* countOf("text_vectors");
        expect(vectors).toStrictEqual([FILES.length]);
      }).pipe(Effect.scoped),
    );
  },
);
