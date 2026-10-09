import type { ReactNode } from "react";

import { ProjectItem } from "./project-item";

const HEADING = "Projects";
const HEADING_ID = "projects";

const projects = [
  {
    name: "cc-jev-teacher",
    description:
      "Claude Code plugin: TypeSafe-judged hooks that make Claude finish the job before it reports",
  },
  {
    name: "mirucord",
    description:
      "Read-only Discord MCP server with semantic search, hosted on Cloudflare. Self-hostable.",
  },
  {
    name: "cdmm",
    description: "Run multiple Claude Max accounts in the official Claude Desktop on Windows",
  },
  {
    name: "gemini-rag-mcp",
    description: "MCP server that provides RAG capabilities using the Gemini API File Search",
  },
  {
    name: "slack-webhook-mcp",
    description:
      "A Model Context Protocol (MCP) server that enables LLM applications to send messages to Slack via webhooks",
  },
] as const;

const ProjectSection = (): ReactNode => (
  <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
    <h2
      className="text-muted-foreground text-xs font-semibold tracking-widest uppercase"
      id={HEADING_ID}
    >
      {HEADING}
    </h2>
    <ul className="divide-border border-border divide-y border-y">
      {projects.map(({ name, description }) => (
        <ProjectItem description={description} key={name} name={name} />
      ))}
    </ul>
  </section>
);

export { ProjectSection };
