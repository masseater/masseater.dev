import { rustCrate, skill, workspace } from "@r_masseater/wism";
import type { WismConfig } from "@r_masseater/wism";
import { Array as Arr, Predicate, String as Str, pipe } from "effect";

const NEGATION = "!";
const isIgnore = Predicate.not(Str.startsWith(NEGATION));

export interface StructureOptions {
  readonly members: readonly string[];
  readonly ignorePatterns: readonly string[];
}

export const structureOf = ({ members, ignorePatterns }: StructureOptions): WismConfig => ({
  kinds: [workspace({ paths: members }), rustCrate(), skill()],
  ignores: pipe(ignorePatterns, Arr.filter(isIgnore)),
});
