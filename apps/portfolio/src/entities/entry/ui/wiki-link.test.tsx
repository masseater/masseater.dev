import { Effect } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, expect, test } from "vite-plus/test";

import { allEntries } from "#/entities/entry/api/entries";

import { WikiLink } from "./wiki-link";

const label = "文言";

beforeAll(() => Effect.runPromise(allEntries));

test("ある記事へはリンクする", () => {
  expect(renderToStaticMarkup(<WikiLink slug="piper">{label}</WikiLink>)).toBe(
    '<a href="/sloppedia/piper">文言</a>',
  );
});

test("見出しを渡すと、その見出しへリンクする", () => {
  expect(
    renderToStaticMarkup(
      <WikiLink hash="概要" slug="piper">
        {label}
      </WikiLink>,
    ),
  ).toBe('<a href="/sloppedia/piper#概要">文言</a>');
});

test("まだ無い記事はリンクにせず赤字で示す", () => {
  expect(renderToStaticMarkup(<WikiLink slug="not-written-yet">{label}</WikiLink>)).toBe(
    '<span class="text-wiki-link-new" title="未作成の記事">文言</span>',
  );
});
