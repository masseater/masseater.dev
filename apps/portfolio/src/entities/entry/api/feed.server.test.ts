import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";

import type { Entry } from "#/entities/entry/model/entry";
import { site } from "#/shared/config";

import { feedResponse } from "./feed.server";

const { entries } = vi.hoisted(() => {
  const base = {
    description: "説明",
    date: "2026-01-02",
    updated: "2026-01-02",
    tags: [],
    infobox: [],
  };
  const fixtures: readonly Entry[] = [
    { ...base, category: "blogs", slug: "published-blog", title: "公開", status: "published" },
    { ...base, category: "blogs", slug: "idea-blog", title: "アイデア", status: "idea" },
    { ...base, category: "blogs", slug: "draft-blog", title: "下書き", status: "draft" },
    { ...base, category: "sloppedia", slug: "wiki-article", title: "事典", status: "published" },
  ];
  return { entries: fixtures };
});

vi.mock("./entries", () => ({ allEntries: Effect.succeed(entries) }));

const ITEM_ID = /<guid[^>]*>(?<id>[^<]+)<\/guid>/gu;

const itemIds = (feed: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(ITEM_ID)(feed)),
    Arr.map(({ groups }) =>
      pipe(
        Option.fromNullishOr(groups),
        Option.flatMap((found) => Rec.get(found, "id")),
      ),
    ),
    Arr.getSomes,
  );

const feedText = (): Promise<string> =>
  Effect.runPromise(
    Effect.promise(feedResponse).pipe(
      Effect.flatMap((response) => Effect.promise(() => response.text())),
    ),
  );

const feedItemIds = (): Promise<readonly string[]> =>
  Effect.runPromise(Effect.promise(feedText).pipe(Effect.map(itemIds)));

test("フィードの記事は、公開した blogs の記事だけである", () =>
  expect(feedItemIds()).resolves.toStrictEqual([`${site.url}/blogs/published-blog`]));

test.each(["idea-blog", "draft-blog", "wiki-article", "/sloppedia/"])(
  "%s はフィードのどこにも出ない",
  (hidden) => expect(feedText()).resolves.not.toContain(hidden),
);
