import { String as Str, pipe } from "effect";

import { atPath, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withinText, withKeys } from "#/features/zizmor/lib/location.ts";
import { repoLocation } from "#/features/zizmor/lib/pre-commit.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";

const meta = {
  ident: "insecure-url-scheme",
  desc: "use of an insecure scheme within a URL",
} as const;

const INSECURE = new Set(["http", "git"]);
const TRAILING_COLON = /:$/u;

export const insecureUrlScheme: Audit = {
  ...meta,
  preCommitRepo: (repo) => {
    if (repo.model.type !== "remote") {
      return [];
    }
    const scheme = Str.replace(TRAILING_COLON, "")(repo.model.url.protocol);
    if (!INSECURE.has(scheme)) {
      return [];
    }
    const annotation = `repository URL uses an insecure scheme: "${scheme}"`;
    const url = withinText(repo.model.url.href);
    return [
      pipe(
        finding(meta),
        confidence("high"),
        severity("high"),
        atPath(repoLocation(repo), primary, withKeys("repo"), annotated(annotation), url),
      ),
    ];
  },
};
