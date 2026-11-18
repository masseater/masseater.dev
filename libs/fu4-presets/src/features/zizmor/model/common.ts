import type { Option } from "effect";

export type LoE<Value> =
  | { readonly type: "expr"; readonly raw: string }
  | { readonly type: "literal"; readonly value: Value };

export type EnvValue =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean };

export type If =
  | { readonly type: "bool"; readonly value: boolean }
  | { readonly type: "expr"; readonly raw: string };

export type BasePermission = "default" | "read-all" | "write-all";

export type Permission = "read" | "write" | "none";

export type Permissions =
  | { readonly type: "base"; readonly base: BasePermission }
  | { readonly type: "explicit"; readonly permissions: ReadonlyMap<string, Permission> };

export type CacheMode = "read" | "write" | "write-only" | "none";

export interface RepositoryUses {
  readonly type: "repository";
  readonly raw: string;
  readonly owner: string;
  readonly repo: string;
  readonly slug: string;
  readonly subpath: Option.Option<string>;
  readonly gitRef: string;
}

export interface DockerUses {
  readonly type: "docker";
  readonly raw: string;
  readonly registry: Option.Option<string>;
  readonly image: string;
  readonly tag: Option.Option<string>;
  readonly hash: Option.Option<string>;
}

export interface LocalUses {
  readonly type: "local";
  readonly raw: string;
}

export type Uses = RepositoryUses | DockerUses | LocalUses;
