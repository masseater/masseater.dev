import { Option } from "effect";

import { toolkitBool } from "#/features/zizmor/lib/env.ts";
import { extracted } from "#/features/zizmor/lib/expressions.ts";
import type { EnvValue } from "#/features/zizmor/model/common.ts";
import type { Confidence } from "#/features/zizmor/model/finding.ts";

export const revocation = (value: EnvValue): Option.Option<readonly [Confidence, string]> =>
  Option.match(toolkitBool(value), {
    onSome: (skip) =>
      Option.liftPredicate(["high", "token revocation disabled here"] as const, () => skip),
    onNone: () =>
      Option.liftPredicate(
        ["low", "token revocation conditionally disabled here"] as const,
        () => value.type === "string" && extracted(value.value).fenced,
      ),
  });
