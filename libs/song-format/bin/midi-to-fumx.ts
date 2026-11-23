#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Command } from "effect/cli";

import { convertCommand } from "#/app/convert-command.ts";
import { convertMidiFile } from "#/app/midi-to-fumx.ts";

const command = convertCommand({
  name: "midi-to-fumx",
  input: "A Standard MIDI File (.mid)",
  source: "MIDI file",
  convert: convertMidiFile,
});

runMain("midi-to-fumx")(Command.run(command, { version: "0.0.0" }));
