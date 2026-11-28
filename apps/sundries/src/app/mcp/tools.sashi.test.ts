import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { afterAll, beforeAll, beforeEach } from "vite-plus/test";

import { registerSashiTools } from "#/features/edit-sashi/index.ts";

import {
  broker,
  callTool,
  github,
  NEW_PULL,
  REPO,
  sentRequests,
  setScene,
} from "./tools.test.support.ts";

beforeAll(() => {
  github.listen({ onUnhandledFrame: "error" });
});

beforeEach(() => {
  setScene({});
});

afterAll(() => {
  github.close();
});

const register = registerSashiTools({ SLOPPEDIA_GITHUB: broker });

const PATH = "apps/sashi/content/quiet-site.json";

const OK = 200;

const NOT_FOUND = 404;

const ONCE = 1;

const reference = (
  slug: string,
  fields: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> => ({
  slug,
  title: slug,
  kind: "site",
  note: `${slug} のメモ`,
  date: "2026-11-28",
  ...fields,
});

const PutBody = Schema.Struct({ content: Schema.String, branch: Schema.String });

const decodePutBody = Schema.decodeUnknownEffect(PutBody);

const written = Effect.gen(function* writtenFile() {
  const put = pipe(
    sentRequests(),
    Arr.findFirst(({ method, path }) => method === "PUT" && path === `${REPO}/contents/${PATH}`),
  );
  const { content, branch } = yield* decodePutBody(Option.getOrThrow(put).body);
  const text = yield* Effect.fromResult(Base64.decodeString(content));
  return { branch, text };
});

it.effect("参照を JSON のファイルにして PR を出し、auto-merge を有効にする", () =>
  Effect.gen(function* newReference() {
    const { isError, text } = yield* callTool({
      register,
      name: "write_sashi_reference",
      arguments: { slug: "quiet-site", title: "静かなサイト", kind: "site", note: "余白が広い" },
    });
    expect(isError).toBe(false);
    expect(text).toContain(`/pull/${String(NEW_PULL)}`);
    const { branch, text: file } = yield* written;
    expect(branch).toBe("sashi/quiet-site");
    expect(Option.getOrThrow(Str.match(/"note": "余白が広い"/u)(file))).toBeDefined();
    expect(
      pipe(
        sentRequests(),
        Arr.filter(({ path }) => path === "/graphql"),
      ),
    ).toHaveLength(ONCE);
  }),
);

it.effect("slug が kebab-case でなければ書き込まずに断る", () =>
  Effect.gen(function* badSlug() {
    const { isError } = yield* callTool({
      register,
      name: "write_sashi_reference",
      arguments: { slug: "Quiet Site", title: "t", kind: "site", note: "n" },
    });
    expect(isError).toBe(true);
    expect(sentRequests()).toStrictEqual([]);
  }),
);

it.effect("種類で絞って一覧を返す", () =>
  Effect.gen(function* byKind() {
    setScene({
      sashi: {
        status: OK,
        body: {
          references: [reference("a", { kind: "site" }), reference("b", { kind: "music" })],
        },
      },
    });
    const { isError, text } = yield* callTool({
      register,
      name: "list_sashi_references",
      arguments: { kind: "music" },
    });
    expect(isError).toBe(false);
    expect(text).toContain('"title":"b"');
    expect(text).not.toContain('"title":"a"');
  }),
);

it.effect("語句で絞って一覧を返す", () =>
  Effect.gen(function* byQuery() {
    setScene({
      sashi: {
        status: OK,
        body: {
          references: [
            reference("a", { note: "余白が広い" }),
            reference("b", { note: "線が細い" }),
          ],
        },
      },
    });
    const { text } = yield* callTool({
      register,
      name: "list_sashi_references",
      arguments: { query: "余白" },
    });
    expect(text).toContain('"title":"a"');
    expect(text).not.toContain('"title":"b"');
  }),
);

it.effect("サイトが答えなければ失敗を返す", () =>
  Effect.gen(function* siteDown() {
    setScene({ sashi: { status: NOT_FOUND, body: { message: "Not Found" } } });
    const { isError, text } = yield* callTool({
      register,
      name: "list_sashi_references",
      arguments: {},
    });
    expect(isError).toBe(true);
    expect(text).toContain("masseater.dev");
  }),
);
