import { Array as Arr, Schema, String as Str, pipe } from "effect";

import { sectionMeta, sectionPath } from "#/shared/config";
import type { Section } from "#/shared/config";

export const categories = ["blogs", "sloppedia"] as const satisfies readonly Section[];

export const CategorySchema = Schema.Literals(categories);

export type Category = typeof CategorySchema.Type;

export type Robots = "index" | "noindex";

export const categoryMeta = {
  blogs: { ...sectionMeta.blogs, schemaType: "BlogPosting", robots: "index" },
  sloppedia: { ...sectionMeta.sloppedia, schemaType: "Article", robots: "noindex" },
} as const satisfies Record<
  Category,
  Readonly<{
    title: string;
    description: string;
    schemaType: "Article" | "BlogPosting";
    robots: Robots;
  }>
>;

export const categoryPath = (category: Category): string => sectionPath(category);

const unindexedPaths = pipe(
  categories,
  Arr.filter((category) => categoryMeta[category].robots === "noindex"),
  Arr.flatMap((category) => [categoryPath(category), `/og${categoryPath(category)}`]),
);

export const isUnindexedPath = (path: string): boolean =>
  pipe(
    unindexedPaths,
    Arr.some((prefix) => path === prefix || Str.startsWith(`${prefix}/`)(path)),
  );
