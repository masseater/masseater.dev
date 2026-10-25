import { Array as Arr, String as Str, pipe } from "effect";

import { site } from "#/shared/config";

type JsonLd = Readonly<Record<string, unknown>>;

type Meta = Readonly<Record<string, string>>;

type Script = Readonly<{ type: string; children: string }>;

type Head = Readonly<{
  meta: Meta[];
  links: Readonly<Record<string, string>>[];
  scripts: Script[];
}>;

type Image = Readonly<{ path: string; alt: string }>;

const absoluteUrl = (path: string): string => new URL(path, site.url).href;

const defaultImage: Image = { path: site.ogImage.path, alt: site.name };

const jsonLd = (data: JsonLd): Script => ({
  type: "application/ld+json",
  children: pipe(
    JSON.stringify({ "@context": "https://schema.org", ...data }),
    Str.replaceAll("<", String.raw`\u003c`),
  ),
});

const seo = ({
  title,
  description,
  path,
  type,
  image,
  extra,
  structuredData,
}: Readonly<{
  title: string;
  description: string;
  path: string;
  type: "website" | "article";
  image: Image;
  extra: readonly Meta[];
  structuredData: readonly JsonLd[];
}>): Head => {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:image", content: absoluteUrl(image.path) },
      { property: "og:image:type", content: site.ogImage.type },
      { property: "og:image:width", content: `${site.ogImage.width}` },
      { property: "og:image:height", content: `${site.ogImage.height}` },
      { property: "og:image:alt", content: image.alt },
      { name: "twitter:image:alt", content: image.alt },
      ...extra,
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: pipe(
      structuredData,
      Arr.map((data) => jsonLd(data)),
    ),
  };
};

const pageTitle = (title: string): string => `${title} | ${site.name}`;

const notFoundHead: Head = { meta: [{ title: pageTitle("Not Found") }], links: [], scripts: [] };

const author: JsonLd = { "@type": "Person", name: site.name, url: site.url };

export type { Head, Image, JsonLd, Meta, Script };
export { absoluteUrl, author, defaultImage, notFoundHead, pageTitle, seo };
