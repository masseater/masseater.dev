import {
  Array as Arr,
  Duration,
  Effect,
  Option,
  Record as Rec,
  Schedule,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

const TAGS = /<[^>]+>/gu;
const FREE = /^(?:CC0|CC BY|CC-BY|Public domain|PD|GFDL|Attribution|No restrictions|FAL)/iu;
const USER_AGENT = "masseater.dev seikin-techniques (https://masseater.dev)";
const BATCH = 40;
const RETRIES = 5;
const BACKOFF_SECONDS = 2;
const PAUSE_SECONDS = 1;
const BACKOFF = Duration.seconds(BACKOFF_SECONDS);
const PAUSE = Duration.seconds(PAUSE_SECONDS);
const THUMB_WIDTH = "800";
const ARTIST_LIMIT = 120;
const START = 0;
const FILE_PREFIX = "File:";
const INDENT = { space: 2 } as const;

const Step = Schema.Struct({ from: Schema.String, to: Schema.String });
const Steps = Schema.optionalKey(Schema.Array(Step));

const Page = Schema.Struct({ title: Schema.String, pageimage: Schema.optionalKey(Schema.String) });
const PageQuery = Schema.Struct({
  normalized: Steps,
  redirects: Steps,
  pages: Schema.optionalKey(Schema.Array(Page)),
});
const PageImages = Schema.Struct({ query: Schema.optionalKey(PageQuery) });

const Meta = Schema.optionalKey(Schema.Struct({ value: Schema.Unknown }));
const ExtMetadata = Schema.Struct({ LicenseShortName: Meta, Artist: Meta });
const ImageInfo = Schema.Struct({
  url: Schema.String,
  descriptionurl: Schema.String,
  thumburl: Schema.optionalKey(Schema.String),
  width: Schema.optionalKey(Schema.Finite),
  height: Schema.optionalKey(Schema.Finite),
  thumbwidth: Schema.optionalKey(Schema.Finite),
  thumbheight: Schema.optionalKey(Schema.Finite),
  extmetadata: Schema.optionalKey(ExtMetadata),
});
const FilePage = Schema.Struct({
  title: Schema.String,
  imageinfo: Schema.optionalKey(Schema.Array(ImageInfo)),
});
const FileQuery = Schema.Struct({
  normalized: Steps,
  pages: Schema.optionalKey(Schema.Array(FilePage)),
});
const Commons = Schema.Struct({ query: Schema.optionalKey(FileQuery) });

const Example = Schema.Struct({
  artist: Schema.String,
  file: Schema.String,
  height: Schema.optionalKey(Schema.Finite),
  license: Schema.String,
  src: Schema.String,
  title: Schema.String,
  width: Schema.optionalKey(Schema.Finite),
});
const Examples = Schema.Record(Schema.String, Example);
const ExamplesFile = Schema.fromJsonString(Examples, INDENT);

type StepValue = typeof Step.Type;
type ImageInfoValue = typeof ImageInfo.Type;
type ExampleValue = typeof Example.Type;
type Licensed = Omit<ExampleValue, "title">;

const listOf = <Item>(items: readonly Item[] | undefined): readonly Item[] => items ?? [];

const underscored = Str.replaceAll(" ", "_");

const query = Effect.fn("wikimedia.query")(function* query<Codec extends Schema.Constraint>(
  codec: Codec,
  host: string,
  params: Readonly<Record<string, string>>,
) {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.filterStatusOk,
    HttpClient.retry({ schedule: Schedule.exponential(BACKOFF), times: RETRIES }),
  );
  const response = yield* client.get(`https://${host}/w/api.php`, {
    urlParams: { action: "query", format: "json", formatversion: "2", ...params },
    headers: { "User-Agent": USER_AGENT },
    acceptJson: true,
  });
  yield* Effect.sleep(PAUSE);
  return yield* HttpClientResponse.schemaBodyJson(codec)(response);
});

const textOf = (meta: { readonly value: unknown } | undefined): string =>
  pipe(
    Option.fromUndefinedOr(meta),
    Option.map(({ value }) => value),
    Option.filter(Str.isString),
    Option.map(Str.replaceAll(TAGS, "")),
    Option.map(Str.trim),
    Option.getOrElse(() => ""),
  );

const originOf =
  (steps: readonly StepValue[]) =>
  (title: string): string => {
    const step = Arr.findFirst(steps, ({ to }) => to === title);
    if (Option.isNone(step)) {
      return title;
    }
    const rest = pipe(
      steps,
      Arr.filter((other) => other !== step.value),
    );
    return originOf(rest)(step.value.from);
  };

const imagesOfPage = ({
  query: found,
}: typeof PageImages.Type): readonly (readonly [string, string])[] => {
  const steps = Option.fromUndefinedOr(found);
  const origin = originOf(
    pipe(
      steps,
      Option.map(({ normalized, redirects }) => [...listOf(normalized), ...listOf(redirects)]),
      Option.getOrElse((): readonly StepValue[] => []),
    ),
  );
  const pages = pipe(
    steps,
    Option.map(({ pages: listed }) => listOf(listed)),
    Option.getOrElse(() => []),
  );
  return pipe(
    pages,
    Arr.flatMap(({ title, pageimage }) =>
      pipe(
        Option.fromUndefinedOr(pageimage),
        Option.map((file) => [origin(title), file] as const),
        Option.toArray,
      ),
    ),
  );
};

/** @internal */
const pageImages = Effect.fn("pageImages")(function* pageImages(
  lang: string,
  titles: readonly string[],
) {
  const pages = yield* Effect.forEach(Arr.chunksOf(titles, BATCH), (batch) =>
    query(PageImages, `${lang}.wikipedia.org`, {
      prop: "pageimages",
      piprop: "name",
      redirects: "1",
      titles: Arr.join(batch, "|"),
    }),
  );
  return pipe(pages, Arr.flatMap(imagesOfPage), Rec.fromEntries);
});

const sourceOf = (info: ImageInfoValue): string =>
  pipe(
    Str.split(info.thumburl ?? info.url, "?"),
    Arr.head,
    Option.getOrElse(() => info.url),
  );

const licensedOf = (info: ImageInfoValue): Option.Option<Licensed> => {
  const meta = Option.fromUndefinedOr(info.extmetadata);
  const license = pipe(
    meta,
    Option.flatMapNullishOr((found) => found.LicenseShortName),
    Option.getOrUndefined,
    textOf,
  );
  const artist = pipe(
    meta,
    Option.flatMapNullishOr((found) => found.Artist),
    Option.getOrUndefined,
    textOf,
  );
  const size = Rec.getSomes({
    width: Option.fromUndefinedOr(info.thumbwidth ?? info.width),
    height: Option.fromUndefinedOr(info.thumbheight ?? info.height),
  });
  return Option.liftPredicate(
    {
      src: sourceOf(info),
      ...size,
      file: info.descriptionurl,
      artist: Str.slice(START, ARTIST_LIMIT)(artist),
      license,
    },
    () => FREE.test(license),
  );
};

const filesOfPage = ({
  query: found,
}: typeof Commons.Type): readonly (readonly [string, Licensed])[] => {
  const result = Option.fromUndefinedOr(found);
  const origin = originOf(
    pipe(
      result,
      Option.map(({ normalized }) => listOf(normalized)),
      Option.getOrElse(() => []),
    ),
  );
  const pages = pipe(
    result,
    Option.map(({ pages: listed }) => listOf(listed)),
    Option.getOrElse(() => []),
  );
  return pipe(
    pages,
    Arr.flatMap(({ title, imageinfo }) =>
      pipe(
        Arr.head(listOf(imageinfo)),
        Option.flatMap(licensedOf),
        Option.map((licensed) => {
          const name = Str.slice(FILE_PREFIX.length)(origin(title));
          return [underscored(name), licensed] as const;
        }),
        Option.toArray,
      ),
    ),
  );
};

/** @internal */
const commons = Effect.fn("commons")(function* commons(files: readonly string[]) {
  const pages = yield* pipe(
    Arr.chunksOf(files, BATCH),
    Effect.forEach((batch) => {
      const titles = pipe(
        batch,
        Arr.map((name) => `${FILE_PREFIX}${name}`),
        Arr.join("|"),
      );
      return query(Commons, "commons.wikimedia.org", {
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: THUMB_WIDTH,
        titles,
      });
    }),
  );
  return pipe(pages, Arr.flatMap(filesOfPage), Rec.fromEntries);
});

export { Examples, ExamplesFile, commons, pageImages, underscored };
export type { ExampleValue, Licensed };
