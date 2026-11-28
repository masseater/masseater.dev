import { it } from "@effect/vitest";
import { Array as Arr, Effect, Schema } from "effect";
import { expect } from "vite-plus/test";

import { ReferenceInput, referenceContent, referencesOf } from "./reference.ts";

const file = (slug: string, date: string): Readonly<Record<string, string>> => ({
  slug,
  title: slug,
  kind: "site",
  url: "https://example.com/",
  note: `${slug} のどこが好きか`,
  date,
});

const slugsOf = (files: Readonly<Record<string, unknown>>): Effect.Effect<readonly string[]> =>
  referencesOf(files).pipe(Effect.map(Arr.map(({ slug }) => slug)), Effect.orDie);

const decodeInput = Schema.decodeEffect(ReferenceInput);

it.effect("新しい順に並べる", () =>
  Effect.gen(function* newestFirst() {
    const slugs = yield* slugsOf({
      "/content/sashi/b.json": file("b", "2026-01-01"),
      "/content/sashi/a.json": file("a", "2026-02-01"),
    });
    expect(slugs).toStrictEqual(["a", "b"]);
  }),
);

it.effect("同じ日の参照は slug の順に並べる", () =>
  Effect.gen(function* sameDay() {
    const slugs = yield* slugsOf({
      "/content/sashi/z.json": file("z", "2026-01-01"),
      "/content/sashi/y.json": file("y", "2026-01-01"),
    });
    expect(slugs).toStrictEqual(["y", "z"]);
  }),
);

it.effect("日付の形が違うファイルは読み込みに失敗する", () =>
  Effect.gen(function* malformed() {
    const failure = yield* Effect.flip(
      referencesOf({ "/content/sashi/a.json": file("a", "2026/01/01") }),
    );
    expect(failure).toBeInstanceOf(Schema.SchemaError);
  }),
);

it.effect("入力に日付を足した JSON を、整形済みの形で書く", () =>
  Effect.gen(function* content() {
    const input = yield* decodeInput({
      slug: "quiet-site",
      title: "静かなサイト",
      kind: "site",
      url: "https://example.com/",
      note: "余白が広い",
    });
    const written = yield* referenceContent({ date: "2026-11-28", input });
    expect(written).toBe(
      `{
  "slug": "quiet-site",
  "title": "静かなサイト",
  "kind": "site",
  "url": "https://example.com/",
  "note": "余白が広い",
  "date": "2026-11-28"
}
`,
    );
  }),
);

it.effect("slug は kebab-case 以外を受け付けない", () =>
  Effect.gen(function* badSlug() {
    const failure = yield* Effect.flip(
      decodeInput({ slug: "Bad Slug", title: "t", kind: "concept", note: "n" }),
    );
    expect(failure).toBeInstanceOf(Schema.SchemaError);
  }),
);
