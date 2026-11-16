import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

import { site } from "#/shared/config/index.ts";
import { wiki } from "#/shared/wiki/index.ts";

export type JsonLd = Readonly<Record<string, unknown>>;

export type Meta = Readonly<Record<string, string>>;

export type Script = Readonly<{ type: string; children: string }>;

export type Head = Readonly<{
  meta: Meta[];
  links: Readonly<Record<string, string>>[];
  scripts: Script[];
}>;

export type Image = Readonly<{ path: string; alt: string }>;

export const absoluteUrl = (path: string): string => new URL(path, site.url).href;

export const defaultImage: Image = { path: site.ogImage.path, alt: site.name };

const encodeJson = Schema.encodeOption(Schema.fromJsonString(Schema.Unknown));

const EMPTY_JSON = "{}";

const jsonLd = (data: JsonLd): Script => ({
  type: "application/ld+json",
  children: pipe(
    encodeJson({ "@context": "https://schema.org", ...data }),
    Option.getOrElse(() => EMPTY_JSON),
    Str.replaceAll("<", String.raw`\u003c`),
  ),
});

export const seo = ({
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

export const pageTitle = (title: string): string => `${title} | ${site.name}`;

export const wikiPageTitle = (title: string): string => `${title} - ${wiki.name}`;

export const notFoundHead: Head = {
  meta: [{ title: pageTitle("Not Found") }],
  links: [],
  scripts: [],
};

export const author: JsonLd = { "@type": "Person", name: site.name, url: site.url };
