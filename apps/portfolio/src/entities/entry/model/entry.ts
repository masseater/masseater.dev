import { Effect, Schema } from "effect";

import { categoryPath } from "./category";
import type { Category } from "./category";

const DateString = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u));

const Tags = Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([])));

const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  date: DateString,
  tags: Tags,
  published: Schema.Boolean,
});

type Entry = Readonly<
  Omit<typeof Frontmatter.Type, "published"> & {
    category: Category;
    slug: string;
    status: "published" | "draft";
  }
>;

type Missing = Readonly<{ status: "missing" }>;

type CollectionResult =
  | Readonly<{ status: "found"; category: Category; entries: readonly Entry[] }>
  | Missing;

type EntryResult = Readonly<{ status: "found"; entry: Entry }> | Missing;

const entryPath = ({ category, slug }: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `${categoryPath(category)}/${slug}`;

export type { CollectionResult, Entry, EntryResult, Missing };
export { entryPath, Frontmatter };
