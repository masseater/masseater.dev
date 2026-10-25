import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { categories, categoryPath } from "./src/entities/entry/model/category.ts";
import { site } from "./src/shared/config/site.ts";

const MODIFIED_TIME = /<meta property="article:modified_time" content="(?<date>[^"]+)"/u;

type Page = Readonly<{ sitemap?: Readonly<Record<string, unknown>> | undefined }>;

const categoryPaths = pipe(
  categories,
  Arr.map((category) => categoryPath(category)),
);

const pages = [
  ...pipe(
    ["/", ...categoryPaths],
    Arr.map((path) => ({ path })),
  ),
  ...pipe(
    [site.feedPath, site.robotsPath],
    Arr.map((path) => ({ path, sitemap: { exclude: true } })),
  ),
  ...pipe(
    site.externalPaths,
    Arr.map((path) => ({ path, prerender: { enabled: false } })),
  ),
];

const modifiedTime = (html: string): Option.Option<string> =>
  pipe(
    html,
    Str.match(MODIFIED_TIME),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Rec.get(groups, "date")),
  );

const withLastmod = ({ page, html }: Readonly<{ page: Page; html: string }>): Page | undefined =>
  pipe(
    modifiedTime(html),
    Option.map((lastmod) => ({ ...page, sitemap: { ...page.sitemap, lastmod } })),
    Option.getOrUndefined,
  );

const sitemap = { host: site.url, outputPath: site.sitemapFile } as const;

export type { Page };
export { pages, sitemap, withLastmod };
