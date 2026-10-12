import { Array, Effect, Option, Schema, String } from "effect";

import { categoryMeta, CategorySchema } from "#/entities/entry/model/category";
import type { Category } from "#/entities/entry/model/category";
import type { CollectionResult, Entry, EntryResult, Missing } from "#/entities/entry/model/entry";

const CONTENT_ROOT = "/content/";
const EXTENSION = ".md";
const DATE_LENGTH = "YYYY-MM-DD".length;

const DateString = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}/u));

const Tags = Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([])));

const decodeFrontmatter = Schema.decodeUnknownEffect(
  Schema.Struct({
    title: Schema.String,
    description: Schema.String,
    date: DateString,
    tags: Tags,
    published: Schema.Boolean,
  }),
);

const decodeZennFrontmatter = Schema.decodeUnknownEffect(
  Schema.Struct({
    title: Schema.String,
    emoji: Schema.String,
    type: Schema.Literals(["tech", "idea"]),
    topics: Schema.Array(Schema.String),
    published: Schema.Boolean,
    published_at: DateString,
  }),
);

const decodeLocation = Schema.decodeUnknownEffect(Schema.Tuple([CategorySchema, Schema.String]));

const decodeCategory = Schema.decodeUnknownOption(CategorySchema);

const toStatus = (published: boolean): Entry["status"] => {
  if (published) {
    return "published";
  }
  return "draft";
};

const zennEntry = (slug: string, frontmatter: unknown): Effect.Effect<Entry, Schema.SchemaError> =>
  decodeZennFrontmatter(frontmatter).pipe(
    Effect.map(({ title, topics, published, published_at: publishedAt }) => ({
      category: "zenn",
      slug,
      title,
      description: categoryMeta.zenn.description,
      date: String.takeLeft(publishedAt, DATE_LENGTH),
      tags: topics,
      status: toStatus(published),
    })),
  );

const ownEntry = (
  category: Category,
  slug: string,
  frontmatter: unknown,
): Effect.Effect<Entry, Schema.SchemaError> =>
  decodeFrontmatter(frontmatter).pipe(
    Effect.map(({ title, description, date, tags, published }) => ({
      category,
      slug,
      title,
      description,
      date,
      tags,
      status: toStatus(published),
    })),
  );

const decodeEntry = ([path, frontmatter]: readonly [string, unknown]): Effect.Effect<
  Entry,
  Schema.SchemaError
> =>
  decodeLocation(path.slice(CONTENT_ROOT.length, -EXTENSION.length).split("/")).pipe(
    Effect.flatMap(([category, slug]) => {
      if (category === "zenn") {
        return zennEntry(slug, frontmatter);
      }
      return ownEntry(category, slug, frontmatter);
    }),
  );

const allEntries: Effect.Effect<readonly Entry[], Schema.SchemaError> = Effect.forEach(
  Object.entries(
    import.meta.glob<unknown>("/content/*/*.md", { eager: true, import: "frontmatter" }),
  ),
  decodeEntry,
).pipe(
  Effect.map((entries) =>
    entries
      .filter(({ status }) => import.meta.env.DEV || status === "published")
      .toSorted((left, right) => right.date.localeCompare(left.date)),
  ),
);

const missing: Effect.Effect<Missing> = Effect.succeed({ status: "missing" });

const collectionOf = (category: string): Effect.Effect<CollectionResult, Schema.SchemaError> =>
  Option.match(decodeCategory(category), {
    onNone: (): Effect.Effect<CollectionResult> => missing,
    onSome: (found) =>
      allEntries.pipe(
        Effect.map((entries) => ({
          status: "found",
          category: found,
          entries: entries.filter((entry) => entry.category === found),
        })),
      ),
  });

const found = (entry: Entry): Effect.Effect<EntryResult> =>
  Effect.succeed({ status: "found", entry });

const entryOf = ({
  category,
  slug,
}: Readonly<{ category: string; slug: string }>): Effect.Effect<EntryResult, Schema.SchemaError> =>
  allEntries.pipe(
    Effect.flatMap((entries) =>
      Option.match(
        Array.findFirst(entries, (entry) => entry.category === category && entry.slug === slug),
        { onNone: (): Effect.Effect<EntryResult> => missing, onSome: found },
      ),
    ),
  );

export { allEntries, collectionOf, entryOf };
