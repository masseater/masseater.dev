import { Schema } from "effect";

const categories = ["projects", "blogs", "scraps", "zenn"] as const;

const CategorySchema = Schema.Literals(categories);

type Category = typeof CategorySchema.Type;

const categoryMeta = {
  projects: { title: "Projects", description: "作ったもの" },
  blogs: { title: "Blogs", description: "まとまった文章" },
  scraps: { title: "Scraps", description: "短いメモや作業ログ" },
  zenn: { title: "Zenn", description: "Zenn から移した技術記事" },
} as const satisfies Record<Category, Readonly<{ title: string; description: string }>>;

type CategoryInfo = Readonly<{ category: Category; title: string; description: string }>;

const categoryInfos: readonly CategoryInfo[] = categories.map((category) => ({
  category,
  title: categoryMeta[category].title,
  description: categoryMeta[category].description,
}));

export type { Category, CategoryInfo };
export { CategorySchema, categoryInfos, categoryMeta };
