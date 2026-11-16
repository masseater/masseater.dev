import { Frontmatter as ArticleFrontmatter } from "@masseater.dev/sloppedia/schema";
import { Effect, Schema } from "effect";

import { sectionPath } from "#/shared/config/index.ts";

import type { Category } from "./category.ts";

const Stage = Schema.Literals(["article", "idea"]).pipe(
  Schema.withDecodingDefaultKey(Effect.succeed("article" as const)),
);

export const Frontmatter = Schema.Struct({ ...ArticleFrontmatter.fields, stage: Stage });

export type Entry = Readonly<
  Omit<typeof Frontmatter.Type, "published" | "stage"> & {
    category: Category;
    slug: string;
    status: "published" | "idea" | "draft";
  }
>;

export type Missing = Readonly<{ status: "missing" }>;

export type CollectionResult =
  | Readonly<{ status: "found"; category: Category; entries: readonly Entry[] }>
  | Missing;

export type EntryResult = Readonly<{ status: "found"; entry: Entry }> | Missing;

export const entryPath = ({ category, slug }: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `${sectionPath(category)}/${slug}`;

export const entryOgImagePath = (entry: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `/og${entryPath(entry)}.png`;
