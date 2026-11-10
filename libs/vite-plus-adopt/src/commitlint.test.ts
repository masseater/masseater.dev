import { RuleConfigSeverity } from "@commitlint/types";
import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue } from "@effect/vitest/utils";
import { Effect, Path, String as Str } from "effect";
import type { PlatformError } from "effect";

import { lintCommitMessageFile } from "./commitlint.ts";
import type { VpToolsError } from "./errors.ts";
import { directoryWith, lines } from "./fixture.test.support.ts";
import type { FixtureServices } from "./fixture.test.support.ts";
import type { Report } from "./report.ts";
import type { CommitlintConfig } from "./types.ts";

const TYPES = {
  rules: { "type-enum": [RuleConfigSeverity.Error, "always", ["feat", "fix"]] },
} as const;

const lintMessage = (
  config: CommitlintConfig,
  message: string,
): Effect.Effect<Report, VpToolsError | PlatformError.PlatformError, FixtureServices> =>
  Effect.gen(function* lintFile() {
    const path = yield* Path.Path;
    const root = yield* directoryWith({ COMMIT_EDITMSG: message });
    return yield* lintCommitMessageFile(config, root, path.join(root, "COMMIT_EDITMSG"));
  });

const acceptsAMessage = Effect.gen(function* acceptsAMessage() {
  assertTrue((yield* lintMessage(TYPES, "feat: add a check\n")).valid);
});

const rejectsAMessage = Effect.gen(function* rejectsAMessage() {
  const report = yield* lintMessage(TYPES, "chore: tidy\n");
  assertFalse(report.valid);
  assertTrue(Str.includes("type-enum")(report.output));
});

const ignoresComments = Effect.gen(function* ignoresComments() {
  const report = yield* lintMessage(
    { rules: { "body-empty": [RuleConfigSeverity.Error, "always"] } },
    lines("fix: keep the fallback", "", "# Please enter the commit message"),
  );
  assertTrue(report.valid);
});

layer(fixtureLayer)("linting commit messages", (it) => {
  it.effect("accepts a message that follows the rules", () => acceptsAMessage);
  it.effect("rejects a message that breaks a rule and names the rule", () => rejectsAMessage);
  it.effect("ignores the comment lines git adds to the message file", () => ignoresComments);
});
