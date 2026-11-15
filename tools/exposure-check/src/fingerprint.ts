import { Boolean as Bool } from "effect";

import type { Inventory } from "./inventory.ts";
import type { Surface } from "./surface.ts";

type FindingKind =
  | "open-host"
  | "open-mcp"
  | "unreachable"
  | "oauth-discovery"
  | "access-missing"
  | "access-policy"
  | "access-override"
  | "workers-dev"
  | "preview-urls"
  | "unprotected-entrypoint"
  | "shared-storage"
  | "public-bucket"
  | "dns-only"
  | "tunnel"
  | "pages"
  | "repository-public";

type Finding = Readonly<{ kind: FindingKind; subject: string; detail: string }>;

type Scene = Readonly<{ inventory: Inventory; surface: Surface }>;

const finding = (found: Finding): Finding => found;

const findingIf =
  (condition: boolean) =>
  (found: () => Finding): readonly Finding[] =>
    Bool.match(condition, { onFalse: () => [], onTrue: () => [found()] });

const fingerprint = (found: Finding): string => `${found.kind}:${found.subject}`;

export { finding, findingIf, fingerprint };
export type { Finding, FindingKind, Scene };
