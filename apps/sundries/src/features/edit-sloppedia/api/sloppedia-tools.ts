import { toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { Effect } from "effect";

import { registerPublishTool } from "#/shared/api/index.ts";
import type { ContentBroker } from "#/shared/api/index.ts";

import { ArticleInput } from "./sloppedia-input.ts";
import { articleContent } from "./sloppedia-markdown.ts";

export type SloppediaBindings = Readonly<{ SLOPPEDIA_GITHUB: ContentBroker }>;

const SITE = "https://masseater.dev";

export const registerSloppediaTools = ({
  SLOPPEDIA_GITHUB,
}: SloppediaBindings): ((server: McpServer) => McpServer) =>
  registerPublishTool({
    broker: SLOPPEDIA_GITHUB,
    name: "write_sloppedia_article",
    description: `Add or rewrite an article in Sloppedia (${SITE}/sloppedia/), the owner's opinionated Wikipedia-like encyclopedia.`,
    schema: toolInputOf(ArticleInput),
    publication: (article) =>
      Effect.succeed({
        path: `apps/portfolio/content/sloppedia/${article.slug}.md`,
        branch: `sloppedia/${article.slug}`,
        title: (verb) => `docs(sloppedia): ${verb} ${article.slug}`,
        content: articleContent(article),
      }),
    url: (article) => `${SITE}/sloppedia/${article.slug}`,
  });
