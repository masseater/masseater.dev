import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { articles } from "./articles";
import type { Article } from "./articles";
import type { CatalogExample, CatalogItem } from "./catalog";
import examples from "./generated/examples.json";
import slugTable from "./slugs.json";

const ROOT = "/seikin-techniques";

type WikiImage = Readonly<{
  title: string;
  src: string;
  width: number;
  height: number;
  file: string;
  artist: string;
  license: string;
}>;

type Example =
  | Exclude<CatalogExample, Readonly<{ kind: "link" }>>
  | Readonly<{ kind: "link"; href: string; label: string; image: Option.Option<WikiImage> }>;

type Origin = Readonly<{
  article: Article;
  group: string;
  name: string;
  summary: readonly string[];
}>;

type Technique = Readonly<{
  slug: string;
  name: string;
  origins: Arr.NonEmptyReadonlyArray<Origin>;
  examples: readonly Example[];
}>;

const wikiImages: Readonly<Record<string, WikiImage>> = examples;

const slugs: Readonly<Record<string, string>> = slugTable;

const catalogs = import.meta.glob<readonly CatalogItem[]>(
  ["/content/blogs/laborious-techniques.md", "/content/blogs/video-vj-techniques.md"],
  { query: "?technique-catalog", import: "default", eager: true },
);

const itemsOf = (article: Article): readonly CatalogItem[] =>
  pipe(
    Rec.get(catalogs, `/content/blogs/${article}.md`),
    Option.getOrElse(() => []),
  );

type Entry = Readonly<{ article: Article; item: CatalogItem; slug: string }>;

const enrich = (example: CatalogExample): Example => {
  if (example.kind === "link") {
    return { ...example, image: Rec.get(wikiImages, example.href) };
  }
  return example;
};

const sameExample = (left: Example, right: Example): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const slugOf = (name: string): string =>
  pipe(
    Rec.get(slugs, name),
    Option.getOrElse(() => pipe(name, Str.toLowerCase)),
  );

const entries: readonly Entry[] = pipe(
  articles,
  Arr.flatMap((article) =>
    pipe(
      itemsOf(article),
      Arr.map((item) => ({ article, item, slug: slugOf(item.name) })),
    ),
  ),
);

const techniqueFrom = (group: Arr.NonEmptyReadonlyArray<Entry>): Technique => {
  const [{ slug, item }] = group;
  return {
    slug,
    name: item.name,
    origins: pipe(
      group,
      Arr.map((entry): Origin => ({
        article: entry.article,
        group: entry.item.group,
        name: entry.item.name,
        summary: entry.item.summary,
      })),
    ),
    examples: pipe(
      group,
      Arr.flatMap((entry) => pipe(entry.item.examples, Arr.map(enrich))),
      Arr.dedupeWith(sameExample),
    ),
  };
};

const grouped = Arr.groupBy(entries, ({ slug }) => slug);

const techniqueOf = (slug: string): Option.Option<Technique> =>
  pipe(Rec.get(grouped, slug), Option.map(techniqueFrom));

const techniqueList: readonly Technique[] = pipe(
  entries,
  Arr.map(({ slug }) => slug),
  Arr.dedupe,
  Arr.flatMap((slug) => Option.toArray(techniqueOf(slug))),
);

const techniquePath = (slug: string): string => `${ROOT}/${slug}`;

export type { Example, Origin, Technique, WikiImage };
export { ROOT, techniqueList, techniqueOf, techniquePath };
