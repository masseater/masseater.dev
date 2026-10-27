type ImageCredit = Readonly<{ text: string; href: string }>;

type CatalogExample =
  | Readonly<{ kind: "image"; src: string; alt: string; credit: ImageCredit }>
  | Readonly<{ kind: "youtube"; id: string; title: string }>
  | Readonly<{ kind: "link"; href: string; label: string }>;

type CatalogItem = Readonly<{
  group: string;
  name: string;
  summary: readonly string[];
  examples: readonly CatalogExample[];
}>;

export type { CatalogExample, CatalogItem, ImageCredit };
