import { Array as Arr, pipe } from "effect";

export type Family = "markdown" | "structure" | "workflows" | "secrets";

export type CorpusName = "masseater.dev" | "nodejs/node";

export type Context = Readonly<{
  corpus: string;
  base: string;
  npm: string;
  bins: Readonly<Record<string, string>>;
  config: Readonly<Record<string, string>>;
}>;

export type Case = Readonly<{
  family: Family;
  tool: string;
  version: string;
  own: boolean;
  corpus: CorpusName;
  scope: string;
  repositoryRoot?: boolean;
  command: (context: Context) => string;
  files: (context: Context) => Readonly<Record<string, string>>;
  caches: (context: Context) => readonly string[];
  findings: (stdout: string) => readonly string[];
  keys?: string;
}>;

export type Timing = Readonly<{ mean: number; stddev: number; runs: number }>;

export type Measurement = Readonly<{
  family: Family;
  tool: string;
  version: string;
  own: boolean;
  corpus: CorpusName;
  scope: string;
  cold: Timing;
  warm: Timing;
  peakRssMegabytes: number;
  findings: number;
  keys?: string;
  found: readonly string[];
}>;

export type Tool = Omit<Case, "family" | "corpus" | "files" | "caches"> &
  Partial<Pick<Case, "files" | "caches">>;

const CORPORA: readonly CorpusName[] = ["masseater.dev", "nodejs/node"];

const NO_FILES: Readonly<Record<string, string>> = {};

const NO_CACHES: readonly string[] = [];

export const caseOf =
  ({ family, corpus }: Readonly<{ family: Family; corpus: CorpusName }>) =>
  (tool: Tool): Case => ({
    files: () => NO_FILES,
    caches: () => NO_CACHES,
    ...tool,
    family,
    corpus,
  });

export const casesOf =
  (family: Family) =>
  (tools: readonly Tool[]): readonly Case[] =>
    pipe(
      CORPORA,
      Arr.flatMap((corpus) => pipe(tools, Arr.map(caseOf({ family, corpus })))),
    );
