#!/usr/bin/env node
import { convertMain } from "#/app/convert-command.ts";
import { convertMidiFile } from "#/app/midi-to-fumx.ts";

convertMain({
  name: "midi-to-fumx",
  input: "A Standard MIDI File (.mid)",
  source: "MIDI file",
  convert: convertMidiFile,
});
