import { Array, Effect, Option, Order, Record as Rec, Schema, pipe } from "effect";

import { CategorySchema } from "#/entities/entry/model/category";
import type { Category } from "#/entities/entry/model/category";
import { contentLocation } from "#/entities/entry/model/content";
import { Frontmatter } from "#/entities/entry/model/entry";
import type { CollectionResult, Entry, EntryResult, Missing } from "#/entities/entry/model/entry";

const decodeFrontmatter = Schema.decodeUnknownEffect(Frontmatter);

const decodeLocation = Schema.decodeUnknownEffect(Schema.Tuple([CategorySchema, Schema.String]));

const decodeCategory = Schema.decodeUnknownOption(CategorySchema);

const toStatus = (published: boolean): Entry["status"] => {
  if (published) {
    return "published";
  }
  return "draft";
};

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
  decodeLocation(contentLocation(path)).pipe(
    Effect.flatMap(([category, slug]) => ownEntry(category, slug, frontmatter)),
  );

const allEntries: Effect.Effect<readonly Entry[], Schema.SchemaError> = Effect.forEach(
  Rec.toEntries(
    import.meta.glob<unknown>("/content/*/*.md", { eager: true, import: "frontmatter" }),
  ),
  decodeEntry,
).pipe(
  Effect.map((entries) =>
    pipe(
      entries,
      Array.filter(({ status }) => import.meta.env.DEV || status === "published"),
      Array.sortWith(({ date }) => date, Order.flip(Order.String)),
    ),
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
          entries: pipe(
            entries,
            Array.filter((entry) => entry.category === found),
          ),
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
