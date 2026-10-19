import { Schema } from "effect";

const categories = ["projects", "blogs", "scraps"] as const;

const CategorySchema = Schema.Literals(categories);

type Category = typeof CategorySchema.Type;

type Layout = "index" | "grid";

const categoryMeta = {
  projects: {
    title: "Projects",
    description: "作ったもの",
    titleTransition: "vt-category-projects",
    layout: "index",
  },
  blogs: {
    title: "Blogs",
    description: "まとまった文章",
    titleTransition: "vt-category-blogs",
    layout: "grid",
  },
  scraps: {
    title: "Scraps",
    description: "短いメモや作業ログ",
    titleTransition: "vt-category-scraps",
    layout: "grid",
  },
} as const satisfies Record<
  Category,
  Readonly<{
    title: string;
    description: string;
    titleTransition: string;
    layout: Layout;
  }>
>;

type CategoryInfo = Readonly<{ category: Category; title: string; description: string }>;

const categoryInfos: readonly CategoryInfo[] = categories.map((category) => ({
  category,
  title: categoryMeta[category].title,
  description: categoryMeta[category].description,
}));

const categoryPath = (category: Category): string => `/${category}`;

export type { Category, CategoryInfo, Layout };
export { categories, CategorySchema, categoryInfos, categoryMeta, categoryPath };
