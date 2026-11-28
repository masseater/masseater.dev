import { Array as Arr, Effect, Option, Order, Record as Rec, Schema, pipe } from "effect";

const MAX_TITLE = 80;
const MAX_NOTE = 200;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const WEB_URL = /^https?:\/\//u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

export const KINDS = ["site", "ui", "video", "music", "image", "concept"] as const;

export const KindSchema = Schema.Literals(KINDS);

export type Kind = typeof KindSchema.Type;

export const kindLabels = {
  site: "サイト",
  ui: "UI",
  video: "映像",
  music: "音楽",
  image: "絵・写真",
  concept: "概念・用語",
} as const satisfies Readonly<Record<Kind, string>>;

const Slug = Schema.String.check(Schema.isPattern(SLUG)).annotate({
  description:
    "The reference's English name in kebab-case. An existing slug is rewritten, so reuse it to edit",
});

const Title = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_TITLE)).annotate({
  description: "The work, page or term as it is called",
});

const Url = Schema.String.check(Schema.isPattern(WEB_URL)).annotate({
  description: "Link to the work. Leave out for a concept",
});

const At = Schema.NonEmptyString.annotate({
  description: "The part that matters in a video or song, such as 1:02-1:14",
});

const Note = Schema.NonEmptyString.check(Schema.isMaxLength(MAX_NOTE)).annotate({
  description: "Why the owner points at it, in the owner's own words. Never copy the work",
});

export const ReferenceFields = Schema.Struct({
  title: Title,
  kind: KindSchema,
  url: Schema.optionalKey(Url),
  at: Schema.optionalKey(At),
  note: Note,
});

export const ReferenceInput = Schema.Struct({ slug: Slug, ...ReferenceFields.fields });

export const ReferenceSchema = Schema.Struct({
  ...ReferenceInput.fields,
  date: Schema.String.check(Schema.isPattern(DATE)),
});

export type Reference = typeof ReferenceSchema.Type;

const decodeReference = (content: unknown): Effect.Effect<Reference, Schema.SchemaError> =>
  Schema.decodeUnknownEffect(ReferenceSchema)(content);

const encodeString = Schema.encodeEffect(Schema.fromJsonString(Schema.String));

const newestFirst = Order.combine(
  Order.mapInput(Order.flip(Order.String), ({ date }: Reference) => date),
  Order.mapInput(Order.String, ({ slug }: Reference) => slug),
);

export const referencesOf = (
  files: Readonly<Record<string, unknown>>,
): Effect.Effect<readonly Reference[], Schema.SchemaError> =>
  Effect.forEach(Rec.values(files), decodeReference, { concurrency: 1 }).pipe(
    Effect.map((found) => Arr.sort(found, newestFirst)),
  );

export const referencePath = (slug: string): string => `apps/portfolio/content/sashi/${slug}.json`;

const fieldsOf = ({
  date,
  input,
}: Readonly<{ date: string; input: typeof ReferenceInput.Type }>): readonly (readonly [
  string,
  string,
])[] =>
  pipe(
    [
      ["slug", input.slug],
      ["title", input.title],
      ["kind", input.kind],
      ["url", input.url],
      ["at", input.at],
      ["note", input.note],
      ["date", date],
    ] as const,
    Arr.flatMap(([key, value]) =>
      Option.toArray(Option.map(Option.fromNullishOr(value), (found) => [key, found] as const)),
    ),
  );

const lineOf = ([key, value]: readonly [string, string]): Effect.Effect<string> =>
  Effect.zipWith(encodeString(key), encodeString(value), (name, text) => `  ${name}: ${text}`).pipe(
    Effect.orDie,
  );

export const referenceContent = Effect.fn("referenceContent")(function* referenceContent(
  fields: Readonly<{ date: string; input: typeof ReferenceInput.Type }>,
) {
  const lines = yield* Effect.forEach(fieldsOf(fields), lineOf, { concurrency: 1 });
  return `{\n${Arr.join(lines, ",\n")}\n}\n`;
});
