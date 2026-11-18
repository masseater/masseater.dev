import { Schema } from "effect";
import type { Effect } from "effect";

const taggedError = Schema.TaggedError;

export class GitHubError extends taggedError<GitHubError, { readonly brand: unique symbol }>()(
  "GitHubError",
  { message: Schema.String },
) {}

export interface NamedRef {
  readonly name: string;
  readonly commit: string;
}

export interface RepoRefs {
  readonly branches: readonly NamedRef[];
  readonly tags: readonly NamedRef[];
}

export interface ResolvedRef extends NamedRef {
  readonly kind: "branch" | "tag";
}

export interface Advisory {
  readonly id: string;
  readonly severity: string;
}

export type GitHubEffect<Value> = Effect.Effect<Value, GitHubError>;

export type FastPath = "contained" | "absent" | "unknown";

export interface Reachability {
  readonly known: (slug: string) => (commit: string) => Effect.Effect<boolean>;
  readonly remember: (slug: string) => (commit: string) => Effect.Effect<void>;
}

export interface GitHubClient {
  readonly refs: (slug: string) => GitHubEffect<RepoRefs>;
  readonly exists: (slug: string) => GitHubEffect<boolean>;
  readonly defaultBranch: (slug: string) => GitHubEffect<string>;
  readonly peeled: (slug: string) => (sha: string) => GitHubEffect<string>;
  readonly branchCommits: (slug: string) => (sha: string) => Effect.Effect<FastPath>;
  readonly contains: (slug: string) => (base: string, head: string) => GitHubEffect<boolean>;
  readonly advisories: (slug: string) => (version: string) => GitHubEffect<readonly Advisory[]>;
  readonly reachability: Reachability;
}
