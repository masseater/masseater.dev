import { Effect, Schema } from "effect";

import { categoryPath } from "./category";
import type { Category } from "./category";

const DateString = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u));

const Tags = Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([])));

const Stage = Schema.Literals(["article", "idea"]).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("article" as const)),
);

const Frontmatter = Schema.Struct({
  title: Schema.String,
  description: Schema.String,
  date: DateString,
  tags: Tags,
  published: Schema.Boolean,
  stage: Stage,
});

type Entry = Readonly<
  Omit<typeof Frontmatter.Type, "published" | "stage"> & {
    category: Category;
    slug: string;
    status: "published" | "idea" | "draft";
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
