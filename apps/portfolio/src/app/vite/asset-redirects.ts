import { Array as Arr, Effect, Order, String as Str, pipe } from "effect";
import type { Plugin } from "vite-plus";

import { sectionPath } from "#/shared/config/index.ts";

const CLIENT_ENVIRONMENT = "client";

const MARKDOWN = /\.md$/u;

const MOVED_STATUS = 301;

const slugsOf = (names: readonly string[]): readonly string[] =>
  pipe(
    names,
    Arr.filter(Str.endsWith(".md")),
    Arr.map((name) => Str.replace(MARKDOWN, "")(name)),
  );

export const movedSlugs = ({
  slog,
  blogs,
}: Readonly<{ slog: readonly string[]; blogs: readonly string[] }>): readonly string[] =>
  pipe(slugsOf(slog), Arr.difference(slugsOf(blogs)), Arr.sortWith(String, Order.String));

const redirect = (from: string, to: string): string => `${from} ${to} ${String(MOVED_STATUS)}`;

export const redirectLines = (slugs: readonly string[]): readonly string[] =>
  pipe(
    slugs,
    Arr.flatMap((slug) => [
      redirect(`${sectionPath("blogs")}/${slug}`, `${sectionPath("slog")}/${slug}`),
      redirect(`/og${sectionPath("blogs")}/${slug}.png`, `/og${sectionPath("slog")}/${slug}.png`),
    ]),
  );

export const assetRedirects = (): Plugin => {
  let root = "";
  return {
    name: "asset-redirects",
    apply: "build",
    configResolved: (config): void => {
      ({ root } = config);
    },
    generateBundle(): Promise<void> {
      if (this.environment.name !== CLIENT_ENVIRONMENT) {
        return Promise.resolve();
      }
      const { fs } = this;
      const listed = (directory: string): Effect.Effect<string[]> =>
        Effect.promise(() => fs.readdir(`${root}/content/${directory}`));
      const emitted = Effect.all(
        { slog: listed("slog"), blogs: listed("blogs") },
        { concurrency: 1 },
      ).pipe(
        Effect.map((names) => redirectLines(movedSlugs(names))),
        Effect.flatMap((lines) =>
          Effect.sync(() => {
            this.emitFile({
              type: "asset",
              fileName: "_redirects",
              source: pipe([...lines, ""], Arr.join("\n")),
            });
          }),
        ),
      );
      return Effect.runPromise(emitted);
    },
  };
};
