import { site } from "#/shared/config";

type Head = Readonly<{
  meta: Readonly<Record<string, string>>[];
  links: Readonly<Record<string, string>>[];
}>;

const seo = ({
  title,
  description,
  path,
  type,
}: Readonly<{
  title: string;
  description: string;
  path: string;
  type: "website" | "article";
}>): Head => {
  const url = new URL(path, site.url).href;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
    ],
    links: [{ rel: "canonical", href: url }],
  };
};

const pageTitle = (title: string): string => `${title} | ${site.name}`;

const notFoundHead: Head = { meta: [{ title: pageTitle("Not Found") }], links: [] };

export type { Head };
export { notFoundHead, pageTitle, seo };
