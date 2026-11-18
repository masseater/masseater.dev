import { Effect, Option } from "effect";

import type { AuditContext, Drafts, Produced } from "#/features/audit-workflows/model/audit.ts";
import type { GitHubClient, GitHubEffect } from "#/features/audit-workflows/model/github.ts";

const reported = new Set<string>();

const warned = (message: string): Effect.Effect<Drafts> => {
  if (reported.has(message)) {
    return Effect.succeed([]);
  }
  reported.add(message);
  return Effect.logWarning(`zizmor: ${message}`).pipe(Effect.as<Drafts>([]));
};

export const withGitHub =
  (context: AuditContext) =>
  (run: (client: GitHubClient) => GitHubEffect<Drafts>): Produced =>
    Option.match(context.github, {
      onNone: (): Produced => [],
      onSome: (client) =>
        run(client).pipe(Effect.catchTag("GitHubError", (failure) => warned(failure.message))),
    });

export const draftsIf =
  (draft: () => Drafts) =>
  (condition: boolean): Drafts => {
    if (condition) {
      return draft();
    }
    return [];
  };
