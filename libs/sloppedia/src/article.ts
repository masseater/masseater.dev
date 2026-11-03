import {
  Array as Arr,
  Effect,
  Option,
  Order,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

const DateString = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u));

const InfoboxRowSchema = Schema.Struct({
  label: Schema.String,
  value: Schema.String,
  href: Schema.optionalKey(Schema.String),
});

const Tags = Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([])));

const Infobox = Schema.Array(InfoboxRowSchema).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed([])),
);

const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  date: DateString,
  updated: DateString,
  tags: Tags,
  published: Schema.Boolean,
  infobox: Infobox,
});

type InfoboxRow = typeof InfoboxRowSchema.Type;

type Article = Readonly<Omit<typeof Frontmatter.Type, "published"> & { slug: string }>;

const decodeFrontmatter = Schema.decodeUnknownEffect(Frontmatter);

const EXTENSION = /\.mdx?$/u;

const slugOf = (path: string): string =>
  pipe(
    Str.split(path, "/"),
    Arr.last,
    Option.getOrElse(() => path),
    Str.replace(EXTENSION, ""),
  );

const articleOf = ([path, frontmatter]: readonly [string, unknown]): Effect.Effect<
  Option.Option<Article>,
  Schema.SchemaError
> =>
  decodeFrontmatter(frontmatter).pipe(
    Effect.map(({ published, title, description, date, updated, tags, infobox }) =>
      Option.liftPredicate(
        { slug: slugOf(path), title, description, date, updated, tags, infobox },
        () => published,
      ),
    ),
  );

const newestFirst = <Item extends Article>(articles: readonly Item[]): readonly Item[] =>
  Arr.sortWith(articles, ({ date }) => date, Order.flip(Order.String));

const articlesOf = (
  frontmatters: Readonly<Record<string, unknown>>,
): Effect.Effect<readonly Article[], Schema.SchemaError> =>
  Effect.forEach(Rec.toEntries(frontmatters), articleOf).pipe(
    Effect.map((found) => newestFirst(Arr.getSomes(found))),
  );

export type { Article, InfoboxRow };
export { articlesOf, Frontmatter, InfoboxRowSchema, newestFirst };
