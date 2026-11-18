import type { WismConfig } from "@r_masseater/wism";
import { rustCrate, skill, structure, workspace } from "@r_masseater/wism-presets";
import { Array as Arr, Predicate, String as Str, pipe } from "effect";

const NEGATION = "!";
const isIgnore = Predicate.not(Str.startsWith(NEGATION));

export interface StructureOptions {
  readonly members: readonly string[];
  readonly ignorePatterns: readonly string[];
}

export const structureOf = ({ members, ignorePatterns }: StructureOptions): WismConfig =>
  structure({
    kinds: [workspace({ paths: members }), rustCrate(), skill()],
    ignores: pipe(ignorePatterns, Arr.filter(isIgnore)),
  });
