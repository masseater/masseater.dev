import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Link, Root, RootContent } from "mdast";
import type { MdxJsxAttribute, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";

const ARTICLE_URL = /^\/sloppedia\/(?<slug>[a-z0-9-]+)(?:#(?<hash>.+))?$/u;

const attribute = (name: string, value: string): MdxJsxAttribute => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

const wikiLinkOf: Transform<Link, Option.Option<MdxJsxTextElement>> = (link) =>
  pipe(
    link.url,
    Str.match(ARTICLE_URL),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(({ slug, hash }) =>
      Option.map(Option.fromUndefinedOr(slug), (found) => ({ slug: found, hash })),
    ),
    Option.map(({ slug, hash }) => ({
      type: "mdxJsxTextElement",
      name: "WikiLink",
      attributes: Arr.getSomes([
        Option.some(attribute("slug", slug)),
        Option.map(Option.fromUndefinedOr(hash), (value) => attribute("hash", value)),
      ]),
      children: link.children,
    })),
  );

const toWikiLink: Transform<RootContent, RootContent> = (node) =>
  pipe(
    Option.liftPredicate(node, (candidate): candidate is Link => candidate.type === "link"),
    Option.flatMap(wikiLinkOf),
    Option.getOrElse((): RootContent => node),
  );

const remarkWikiLink: Plugin<[], Root> = () => mapTree(toWikiLink);

export { remarkWikiLink };
