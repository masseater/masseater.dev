export interface Code {
  readonly number: number;
  readonly level: "error" | "info" | "style" | "warning";
  readonly message: string;
}

export const CODES = {
  unquotedExpansion: {
    number: 2086,
    level: "info",
    message: "Double quote to prevent globbing and word splitting",
  },
  unquotedSubstitution: {
    number: 2046,
    level: "warning",
    message: "Quote this to prevent word splitting",
  },
  unquotedArray: {
    number: 2068,
    level: "error",
    message: "Double quote array expansions to avoid re-splitting elements",
  },
  uselessEcho: {
    number: 2005,
    level: "style",
    message: "Useless echo? Instead of 'echo $(cmd)', just use 'cmd'",
  },
  backticks: {
    number: 2006,
    level: "style",
    message: "Use $(...) notation instead of legacy backticks `...`",
  },
  uselessCat: {
    number: 2002,
    level: "style",
    message: "Useless cat. Consider 'cmd < file | ..' or 'cmd file | ..' instead",
  },
  arithmeticDollar: {
    number: 2004,
    level: "style",
    message: `$/\${} is unnecessary on arithmetic variables`,
  },
  localOutsideFunction: {
    number: 2168,
    level: "error",
    message: "'local' is only valid in functions",
  },
  spacedAssignment: {
    number: 2283,
    level: "error",
    message: "Remove spaces around = to assign (or use [ ] to compare, or quote '=' if literal)",
  },
  unquotedArrayElement: {
    number: 2206,
    level: "warning",
    message: "Quote to prevent word splitting/globbing, or split robustly with mapfile or read -a",
  },
  unusedVariable: {
    number: 2034,
    level: "warning",
    message: "appears unused. Verify use (or export if used externally)",
  },
  trailingDot: {
    number: 2288,
    level: "warning",
    message: "This is interpreted as a command name ending with '.'. Double check syntax",
  },
} as const satisfies Readonly<Record<string, Code>>;

export type CodeName = keyof typeof CODES;
