import { Effect, Schema } from "effect";
import { Frontmatter as ArticleFrontmatter } from "sloppedia/schema";

import { categoryPath } from "./category";
import type { Category } from "./category";

const Stage = Schema.Literals(["article", "idea"]).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("article" as const)),
);

const Frontmatter = Schema.Struct({ ...ArticleFrontmatter.fields, stage: Stage });

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

const entryOgImagePath = (entry: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `/og${entryPath(entry)}.png`;

export type { CollectionResult, Entry, EntryResult, Missing };
export { entryOgImagePath, entryPath, Frontmatter };
