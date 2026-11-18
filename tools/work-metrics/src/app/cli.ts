import { Command } from "effect/cli";

import { cloudflareCommand } from "./cloudflare-command.ts";
import { pullRequestsCommand } from "./pull-requests-command.ts";
import { translationsCommand } from "./translations-command.ts";

/** @internal */
export const cli = Command.make("work-metrics").pipe(
  Command.withSubcommands([pullRequestsCommand, cloudflareCommand, translationsCommand]),
);
