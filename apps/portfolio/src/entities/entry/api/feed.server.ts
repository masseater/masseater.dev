import { DateTime, Effect } from "effect";
import { Feed } from "feed";

import { categoryMeta } from "#/entities/entry/model/category";
import type { Entry } from "#/entities/entry/model/entry";
import { entryPath } from "#/entities/entry/model/entry";
import { site } from "#/shared/config";

import { allEntries } from "./entries";

const toFeed = (entries: readonly Entry[]): string => {
  const feed = new Feed({
    title: site.name,
    description: site.description,
    id: site.url,
    link: site.url,
    language: site.locale,
    image: site.ogImage,
    copyright: `© ${site.name}`,
    feedLinks: { rss: `${site.url}${site.feedPath}` },
    author: { name: site.name, link: site.url },
  });
  for (const entry of entries.filter(({ status }) => status === "published")) {
    const link = `${site.url}${entryPath(entry)}`;
    feed.addItem({
      title: entry.title,
      id: link,
      link,
      description: entry.description,
      date: DateTime.toDateUtc(DateTime.makeUnsafe(entry.date)),
      category: [{ name: categoryMeta[entry.category].title }],
    });
  }
  return feed.rss2();
};

const feedResponse = (): Promise<Response> =>
  Effect.runPromise(
    allEntries.pipe(
      Effect.map(
        (entries) =>
          new Response(toFeed(entries), {
            headers: { "content-type": "application/rss+xml; charset=utf-8" },
          }),
      ),
    ),
  );

export { feedResponse };
