import { Array as Arr, Schema, String as Str, pipe } from "effect";

import { sectionMeta, sectionPath } from "#/shared/config/sections";
import type { Section } from "#/shared/config/sections";

const categories = ["blogs", "sloppedia"] as const satisfies readonly Section[];

const CategorySchema = Schema.Literals(categories);

type Category = typeof CategorySchema.Type;

type Robots = "index" | "noindex";

const categoryMeta = {
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

const categoryPath = (category: Category): string => sectionPath(category);

const unindexedPaths = pipe(
  categories,
  Arr.filter((category) => categoryMeta[category].robots === "noindex"),
  Arr.flatMap((category) => [categoryPath(category), `/og${categoryPath(category)}`]),
);

const isUnindexedPath = (path: string): boolean =>
  pipe(
    unindexedPaths,
    Arr.some((prefix) => path === prefix || Str.startsWith(`${prefix}/`)(path)),
  );

export type { Category, Robots };
export { categories, CategorySchema, categoryMeta, categoryPath, isUnindexedPath };
