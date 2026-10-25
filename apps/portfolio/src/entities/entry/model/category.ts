import { portfolio } from "@masseater.dev/ui/portfolio";
import { Array as Arr, Schema, pipe } from "effect";

const categories = ["projects", "blogs", "scraps"] as const;

const CategorySchema = Schema.Literals(categories);

type Category = typeof CategorySchema.Type;

type Layout = "index" | "grid";

const categoryMeta = {
  projects: {
    title: portfolio.sections.projects,
    description: "作ったもの",
    titleTransition: "vt-category-projects",
    schemaType: "Article",
    layout: "index",
  },
  blogs: {
    title: portfolio.sections.blogs,
    description: "まとまった文章",
    titleTransition: "vt-category-blogs",
    schemaType: "BlogPosting",
    layout: "grid",
  },
  scraps: {
    title: portfolio.sections.scraps,
    description: "短いメモや作業ログ",
    titleTransition: "vt-category-scraps",
    schemaType: "BlogPosting",
    layout: "grid",
  },
} as const satisfies Record<
  Category,
  Readonly<{
    title: string;
    description: string;
    titleTransition: string;
    schemaType: "Article" | "BlogPosting";
    layout: Layout;
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

export type { Category, CategoryInfo, Layout };
export { categories, CategorySchema, categoryInfos, categoryMeta, categoryPath };
