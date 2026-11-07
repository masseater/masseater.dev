import { Array, Effect, Option, Order, Record as Rec, Schema, pipe } from "effect";

import { CategorySchema } from "#/entities/entry/model/category";
import type { Category } from "#/entities/entry/model/category";
import { contentLocation, contentPath } from "#/entities/entry/model/content";
import { Frontmatter } from "#/entities/entry/model/entry";
import type { CollectionResult, Entry, EntryResult, Missing } from "#/entities/entry/model/entry";

const decodeFrontmatter = Schema.decodeUnknownEffect(Frontmatter);

const decodeFrontmatterOption = Schema.decodeUnknownOption(Frontmatter);

const decodeLocation = Schema.decodeUnknownEffect(Schema.Tuple([CategorySchema, Schema.String]));

const decodeCategory = Schema.decodeUnknownOption(CategorySchema);

const toStatus = ({
  published,
  stage,
}: Readonly<Pick<typeof Frontmatter.Type, "published" | "stage">>): Entry["status"] => {
  if (!published) {
    return "draft";
  }
  if (stage === "idea") {
    return "idea";
  }
  return "published";
};

const toEntry = (
  { category, slug }: Readonly<Pick<Entry, "category" | "slug">>,
  { title, description, date, updated, tags, published, stage, infobox }: typeof Frontmatter.Type,
): Entry => ({
  category,
  slug,
  title,
  description,
  date,
  updated,
  tags,
  infobox,
  status: toStatus({ published, stage }),
});

const ownEntry = (
  category: Category,
  slug: string,
  frontmatter: unknown,
): Effect.Effect<Entry, Schema.SchemaError> =>
  decodeFrontmatter(frontmatter).pipe(
    Effect.map((decoded) => toEntry({ category, slug }, decoded)),
  );

const decodeEntry = ([path, frontmatter]: readonly [string, unknown]): Effect.Effect<
  Entry,
  Schema.SchemaError
> =>
  decodeLocation(contentLocation(path)).pipe(
    Effect.flatMap(([category, slug]) => ownEntry(category, slug, frontmatter)),
  );

const frontmatters = import.meta.glob<unknown>("/content/*/*.md", {
  eager: true,
  import: "frontmatter",
  query: "?meta",
});

const isVisible = ({ status }: Readonly<Pick<Entry, "status">>): boolean =>
  import.meta.env.DEV || status !== "draft";

const findEntry = (location: Readonly<Pick<Entry, "category" | "slug">>): Option.Option<Entry> =>
  pipe(
    Rec.get(frontmatters, contentPath(location)),
    Option.flatMap(decodeFrontmatterOption),
    Option.map((decoded) => toEntry(location, decoded)),
    Option.filter(isVisible),
  );

const allEntries: Effect.Effect<readonly Entry[], Schema.SchemaError> = Effect.suspend(() =>
  Effect.forEach(Rec.toEntries(frontmatters), decodeEntry),
).pipe(
  Effect.map((entries) =>
    pipe(
      entries,
      Array.filter(isVisible),
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

export { allEntries, collectionOf, entryOf, findEntry };
