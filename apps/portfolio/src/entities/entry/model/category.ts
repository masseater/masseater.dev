import { portfolio } from "@masseater.dev/ui/portfolio";
import { Array as Arr, Schema, pipe } from "effect";

const categories = ["projects", "blogs", "sloppedia"] as const;

const CategorySchema = Schema.Literals(categories);

type Category = typeof CategorySchema.Type;

type Layout = "index" | "grid" | "wiki";

type Robots = "index" | "noindex";

const categoryMeta = {
  projects: {
    title: portfolio.sections.projects,
    description: "作ったもの",
    titleTransition: "vt-category-projects",
    schemaType: "Article",
    layout: "index",
    robots: "index",
  },
  blogs: {
    title: portfolio.sections.blogs,
    description: "まとまった文章",
    titleTransition: "vt-category-blogs",
    schemaType: "BlogPosting",
    layout: "grid",
    robots: "index",
  },
  sloppedia: {
    title: portfolio.sections.sloppedia,
    description: "個人の百科事典もどき",
    titleTransition: "vt-category-sloppedia",
    schemaType: "Article",
    layout: "wiki",
    robots: "noindex",
  },
} as const satisfies Record<
  Category,
  Readonly<{
    title: string;
    description: string;
    titleTransition: string;
    schemaType: "Article" | "BlogPosting";
    layout: Layout;
    robots: Robots;
  }>
>;

type CategoryInfo = Readonly<{ category: Category; title: string; description: string }>;

const categoryInfos: readonly CategoryInfo[] = pipe(
  categories,
  Arr.map((category) => ({
    category,
    title: categoryMeta[category].title,
    description: categoryMeta[category].description,
  })),
);

const categoryPath = (category: Category): string => `/${category}`;

export type { Category, CategoryInfo, Layout, Robots };
export { categories, CategorySchema, categoryInfos, categoryMeta, categoryPath };
