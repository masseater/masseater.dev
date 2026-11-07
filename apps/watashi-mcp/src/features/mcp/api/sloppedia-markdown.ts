import { Array as Arr, Option, String as Str } from "effect";
import { Base64 } from "effect/encoding";
import { stringify } from "yaml";

import type { ArticleInput } from "./sloppedia-input";

type Article = typeof ArticleInput.Type;

const infoboxOf = (article: Article): Readonly<Record<string, Article["infobox"]>> =>
  Option.match(Option.filter(Option.fromNullishOr(article.infobox), Arr.isReadonlyArrayNonEmpty), {
    onNone: () => ({}),
    onSome: (infobox) => ({ infobox }),
  });

const frontmatter = (article: Article): string =>
  stringify(
    {
      title: Str.trim(article.title),
      description: Str.trim(article.description),
      tags: article.tags ?? [],
      published: true,
      ...infoboxOf(article),
    },
    { defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" },
  );

const markdown = (article: Article): string =>
  Arr.join(["---", Str.trimEnd(frontmatter(article)), "---", "", Str.trim(article.body), ""], "\n");

const articleContent = (article: typeof ArticleInput.Type): string =>
  Base64.encode(markdown(article));

export { articleContent };
