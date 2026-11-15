import plugin from "@r_masseater/oxlint-typed-rules/tanstack-start";
import { Option, Record } from "effect";

export const name = "no-async-client-component";

export const rule = Record.get(plugin.rules, name).pipe(
  Option.getOrThrowWith(() => new Error(`rule ${name} is missing`)),
);
