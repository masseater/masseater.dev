#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Command } from "effect/cli";

import { convertLiveSetFile } from "#/app/als-to-fumx.ts";
import { convertCommand } from "#/app/convert-command.ts";

const command = convertCommand({
  name: "als-to-fumx",
  input: "An Ableton Live Set (.als)",
  source: "Live Set",
  convert: convertLiveSetFile,
});

runMain("als-to-fumx")(Command.run(command, { version: "0.0.0" }));
