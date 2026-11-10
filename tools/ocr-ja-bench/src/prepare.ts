import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { provideAtEntry } from "@ocr-decide/tooling";
import {
  Array as Arr,
  Effect,
  Equal,
  FileSystem,
  Layer,
  Option,
  Order,
  Schema,
  pipe,
} from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { parquetReadObjects } from "hyparquet";
import sharp from "sharp";

const REPOSITORY = "llm-jp/jawildtext";
const REVISION = "627ca7ea7c224ffe1accff8737991fc2240784fa";
const LONG_EDGE = 2048;
const PER_SUBSET = 20;
const ONE_ROW = 1;
const INDENT = { space: 2 } as const;
const ONE_DIRECTION = 1;
const ONE_AT_A_TIME = { concurrency: 1 } as const;

const ROOT = new URL("../", import.meta.url);
const IMAGES = new URL(".cache/images/", ROOT).pathname;
const DOWNLOADS = new URL(".cache/jawildtext/", ROOT).pathname;
const MANIFEST = new URL("data/jawildtext.json", ROOT).pathname;

const HANDWRITING = "handwriting_ocr/train-00000-of-00006.parquet";
const RECEIPT = "receipt_kie/train-00000-of-00008.parquet";

const SUBSETS = [
  { file: HANDWRITING, category: "handwriting-horizontal", direction: Option.some("horizontal") },
  { file: HANDWRITING, category: "handwriting-vertical", direction: Option.some("vertical") },
  { file: RECEIPT, category: "receipt-photo", direction: Option.none<string>() },
] as const;

const Direction = Schema.optional(Schema.NullOr(Schema.String));
const Polygon = Schema.Struct({ direction: Direction, text: Schema.String });
const Labels = Schema.Array(
  Schema.Struct({ image_id: Schema.String, polygons: Schema.Array(Polygon) }),
);

const Manifest = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ id: Schema.String, category: Schema.String, truth: Schema.String })),
  INDENT,
);

const ImageRows = Schema.NonEmptyArray(
  Schema.Struct({ image: Schema.Struct({ bytes: Schema.Uint8Array }) }),
);

type Label = (typeof Labels.Type)[number];
type Subset = (typeof SUBSETS)[number];
type Located = Readonly<{ row: number; label: Label }>;

const directionOf = ({ polygons }: Label): Option.Option<Option.Option<string>> => {
  const directions = pipe(
    polygons,
    Arr.map(({ direction }) => Option.fromNullishOr(direction)),
    Arr.dedupe,
  );
  return pipe(
    Arr.head(directions),
    Option.filter(() => directions.length === ONE_DIRECTION),
  );
};

const fetched = Effect.fn("ocr-ja-bench.fetch")(function* fetched(file: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client
    .get(`https://huggingface.co/datasets/${REPOSITORY}/resolve/${REVISION}/${file}`)
    .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  const body = yield* response.arrayBuffer;
  return new Uint8Array(body);
});

const download = Effect.fn("ocr-ja-bench.download")(function* download(file: string) {
  const fs = yield* FileSystem.FileSystem;
  const target = `${DOWNLOADS}${REVISION}/${file}`;
  if (yield* fs.exists(target)) {
    return target;
  }
  yield* fs.makeDirectory(new URL(".", `file://${target}`).pathname, { recursive: true });
  yield* fetched(file).pipe(Effect.flatMap((body) => fs.writeFile(`${target}.tmp`, body)));
  yield* fs.rename(`${target}.tmp`, target);
  return target;
});

const openParquet = Effect.fn("ocr-ja-bench.open")(function* openParquet(path: string) {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(path);
  return Uint8Array.from(bytes).buffer;
});

const pngOf = (bytes: Uint8Array): Effect.Effect<Uint8Array> =>
  Effect.promise(() =>
    sharp(bytes)
      .rotate()
      .resize({
        width: LONG_EDGE,
        height: LONG_EDGE,
        fit: "inside",
        withoutEnlargement: true,
        kernel: "cubic",
      })
      .removeAlpha()
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );

const byImageId = Order.mapInput(Order.Number, ({ label }: Located) => Number(label.image_id));

const picked = (labels: readonly Label[], { direction }: Subset): readonly Located[] => {
  const matching = pipe(
    labels,
    Arr.map((label, row): Located => ({ row, label })),
    Arr.filter(({ label }) =>
      pipe(
        directionOf(label),
        Option.exists((found) => Equal.equals(found, direction)),
      ),
    ),
  );
  return Arr.take(Arr.sort(matching, byImageId), PER_SUBSET);
};

const prepareSubset = Effect.fn("ocr-ja-bench.subset")(function* prepareSubset(subset: Subset) {
  const fs = yield* FileSystem.FileSystem;
  const file = yield* download(subset.file).pipe(Effect.flatMap(openParquet));
  const labels = yield* Effect.promise(() =>
    parquetReadObjects({ file, columns: ["image_id", "polygons"] }),
  ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Labels)));
  return yield* Effect.forEach(
    picked(labels, subset),
    ({ row, label }) =>
      Effect.gen(function* writeImage() {
        const id = `jawildtext-${subset.category}-${label.image_id}`;
        const [image] = yield* Effect.promise(() =>
          parquetReadObjects({
            file,
            columns: ["image"],
            rowStart: row,
            rowEnd: row + ONE_ROW,
            utf8: false,
          }),
        ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(ImageRows)));
        const png = yield* pngOf(image.image.bytes);
        yield* fs.writeFile(`${IMAGES}${id}.png`, png);
        return {
          id,
          category: subset.category,
          truth: pipe(
            label.polygons,
            Arr.map(({ text }) => text),
            Arr.join("\n"),
          ),
        };
      }),
    ONE_AT_A_TIME,
  );
});

const prepare = Effect.gen(function* prepare() {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.makeDirectory(IMAGES, { recursive: true });
  const pages = yield* Effect.forEach(SUBSETS, prepareSubset, ONE_AT_A_TIME);
  const manifest = yield* Schema.encodeEffect(Manifest)(Arr.flatten(pages));
  yield* fs.writeFileString(MANIFEST, `${manifest}\n`);
});

const services = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);

NodeRuntime.runMain(prepare.pipe(provideAtEntry(services)));
