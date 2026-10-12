import type { Category } from "./category";

type Entry = Readonly<{
  category: Category;
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: readonly string[];
  status: "published" | "draft";
}>;

type Missing = Readonly<{ status: "missing" }>;

type CollectionResult =
  | Readonly<{ status: "found"; category: Category; entries: readonly Entry[] }>
  | Missing;

type EntryResult = Readonly<{ status: "found"; entry: Entry }> | Missing;

const entryPath = ({ category, slug }: Readonly<Pick<Entry, "category" | "slug">>): string =>
  `/${category}/${slug}`;

export type { CollectionResult, Entry, EntryResult, Missing };
export { entryPath };
