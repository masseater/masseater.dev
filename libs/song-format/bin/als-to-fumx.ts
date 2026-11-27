#!/usr/bin/env node
import { convertLiveSetFile } from "#/app/als-to-fumx.ts";
import { convertMain } from "#/app/convert-command.ts";

convertMain({
  name: "als-to-fumx",
  input: "An Ableton Live Set (.als)",
  source: "Live Set",
  convert: convertLiveSetFile,
});
