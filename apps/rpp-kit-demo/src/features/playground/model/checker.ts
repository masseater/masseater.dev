import type { Diagnostic as EditorDiagnostic } from "@codemirror/lint";
import { Array as Arr, Effect, HashMap, Match, Option, Order, String as Str, pipe } from "effect";
import {
  API,
  CompletionItemKind,
  DiagnosticCategory,
  ModuleKind,
  ModuleResolutionKind,
} from "typescript-wasm/sync";
import type { CompletionEntry, Diagnostic, Program } from "typescript-wasm/sync";
import { WasmTransport, instantiateWasm } from "typescript-wasm/wasm";

type Source = Readonly<{ path: string; code: string }>;

type At = Source & Readonly<{ position: number }>;

type Severity = EditorDiagnostic["severity"];

type Lint = Readonly<{ from: number; to: number; severity: Severity; message: string }>;

type CompletionOption = Readonly<{ label: string; type: string; detail?: string }>;

type Completion = Readonly<{ from: number; options: readonly CompletionOption[] }>;

type Hover = Readonly<{ text: string; documentation: string }>;

type Checker = Readonly<{
  updateFile: (source: Source) => void;
  lint: (source: Source) => readonly Lint[];
  complete: (at: At) => Completion;
  hover: (at: At) => readonly Hover[];
  transpile: (code: string) => string;
}>;

type Setup = Readonly<{ wasm: ArrayBuffer; files: readonly (readonly [string, string])[] }>;

type Session = Readonly<{ transport: WasmTransport; api: API }>;

const OPTIONS = {
  lib: ["lib.es2024.d.ts", "lib.webworker.d.ts"],
  module: ModuleKind.ESNext,
  moduleResolution: ModuleResolutionKind.Bundler,
  strict: true,
  allowArbitraryExtensions: true,
  noEmit: true,
};

const TRANSPILE_OPTIONS = { compilerOptions: { module: ModuleKind.CommonJS } };

const CHAIN_INDENT = "  ";

const TOP_LEVEL = 0;

const NEXT_LEVEL = 1;

const START = 0;

const QUOTE_PAIR = 2;

const WORD_BEFORE = /[\w$]*$/u;

const IN_STRING = /["'`](?<rest>[^"'`]*)$/u;

const QUOTES = /["'`]/gu;

const severityOf = (category: number): Severity =>
  Match.value(category).pipe(
    Match.when(DiagnosticCategory.Error, (): Severity => "error"),
    Match.when(DiagnosticCategory.Warning, (): Severity => "warning"),
    Match.orElse((): Severity => "info"),
  );

const chainLines = (diagnostic: Diagnostic, depth: number): readonly string[] => [
  `${pipe(CHAIN_INDENT, Str.repeat(depth))}${diagnostic.text}`,
  ...pipe(
    diagnostic.messageChain ?? [],
    Arr.flatMap((child) => chainLines(child, depth + NEXT_LEVEL)),
  ),
];

const lintOf = (diagnostic: Diagnostic): Lint => ({
  from: diagnostic.pos,
  to: diagnostic.end,
  severity: severityOf(diagnostic.category),
  message: pipe(chainLines(diagnostic, TOP_LEVEL), Arr.join("\n")),
});

const typeOfKind = (kind: CompletionItemKind | undefined): string =>
  Match.value(kind).pipe(
    Match.when(CompletionItemKind.Method, () => "method"),
    Match.when(CompletionItemKind.Function, () => "function"),
    Match.when(CompletionItemKind.Constructor, () => "class"),
    Match.when(CompletionItemKind.Class, () => "class"),
    Match.when(CompletionItemKind.Interface, () => "interface"),
    Match.when(CompletionItemKind.Module, () => "namespace"),
    Match.when(CompletionItemKind.Enum, () => "enum"),
    Match.when(CompletionItemKind.Keyword, () => "keyword"),
    Match.when(CompletionItemKind.Constant, () => "constant"),
    Match.when(CompletionItemKind.TypeParameter, () => "type"),
    Match.when(CompletionItemKind.Field, () => "property"),
    Match.when(CompletionItemKind.Property, () => "property"),
    Match.when(CompletionItemKind.Variable, () => "variable"),
    Match.orElse(() => "text"),
  );

const optionOf = (entry: CompletionEntry): CompletionOption => ({
  label: entry.name,
  type: typeOfKind(entry.kind),
  ...pipe(
    Option.fromNullishOr(entry.detail),
    Option.match({ onNone: () => ({}), onSome: (detail) => ({ detail }) }),
  ),
});

const bySortText = Order.mapInput(Order.String, (entry: CompletionEntry) => entry.sortText ?? "");

const lineBefore = ({ code, position }: At): string =>
  pipe(code, Str.slice(START, position), Str.split("\n"), Arr.lastNonEmpty);

const matchedLength = (line: string, pattern: RegExp): Option.Option<number> =>
  pipe(line, Str.match(pattern), Option.flatMap(Arr.last), Option.map(Str.length));

const inString = (line: string): boolean =>
  pipe(line, Str.matchAll(QUOTES), Arr.fromIterable, Arr.length) % QUOTE_PAIR === NEXT_LEVEL;

const replacedFrom = (at: At): number => {
  const line = lineBefore(at);
  return (
    at.position -
    pipe(
      matchedLength(line, IN_STRING),
      Option.filter(() => inString(line)),
      Option.orElse(() => matchedLength(line, WORD_BEFORE)),
      Option.getOrElse(() => START),
    )
  );
};

type Files = Readonly<{
  write: (source: Source) => void;
  program: (source: Source) => Program;
}>;

const filesOf = ({ transport, api }: Session): Files => {
  let contents = HashMap.empty<string, string>();
  let program = Option.none<Program>();
  const write = ({ path, code }: Source): void => {
    if (Option.contains(HashMap.get(contents, path), code)) {
      return;
    }
    transport.setFile(path, code);
    contents = HashMap.set(contents, path, code);
    if (Option.isSome(program)) {
      program.value.dispose();
    }
    program = Option.none();
  };
  return {
    write,
    program: (source) => {
      write(source);
      return Option.getOrElse(program, () => {
        const created = api.createProgram(Arr.fromIterable(HashMap.keys(contents)), OPTIONS);
        program = Option.some(created);
        return created;
      });
    },
  };
};

const lintsIn = (program: Program, path: string): readonly Lint[] =>
  pipe(
    [...program.getSyntacticDiagnostics(path), ...program.getSemanticDiagnostics(path)],
    Arr.map(lintOf),
  );

const optionsAt = (program: Program, { path, position }: At): readonly CompletionOption[] =>
  pipe(
    program.getProject().languageService.getCompletionsAtPosition(path, position),
    Option.fromNullishOr,
    Option.match({
      onNone: () => [],
      onSome: ({ entries }) => pipe(entries, Arr.sortBy(bySortText), Arr.map(optionOf)),
    }),
  );

const hoversAt = (program: Program, { path, position }: At): readonly Hover[] => {
  const { checker } = program.getProject();
  const symbolAt = checker.getSymbolAtPosition(path, position);
  const typeAt = checker.getTypeAtPosition(path, position);
  return pipe(
    Option.all({ symbol: Option.fromNullishOr(symbolAt), type: Option.fromNullishOr(typeAt) }),
    Option.map(({ symbol, type }) => ({
      text: `${symbol.name}: ${checker.typeToString(type)}`,
      documentation: checker.getDocumentationCommentOfSymbol(symbol),
    })),
    Arr.fromOption,
  );
};

const checkerOf = (session: Session): Checker => {
  const files = filesOf(session);
  return {
    updateFile: files.write,
    lint: (source) => lintsIn(files.program(source), source.path),
    complete: (at) => ({ from: replacedFrom(at), options: optionsAt(files.program(at), at) }),
    hover: (at) => hoversAt(files.program(at), at),
    transpile: (code) => session.api.transpileModule(code, TRANSPILE_OPTIONS).outputText,
  };
};

const createChecker = ({ wasm, files }: Setup): Effect.Effect<Checker> =>
  Effect.promise(() => WebAssembly.compile(wasm)).pipe(
    Effect.flatMap((module) => Effect.promise(() => instantiateWasm(module))),
    Effect.map((instance) => {
      const transport = new WasmTransport({ instance, cwd: "/" });
      for (const [path, code] of files) {
        transport.setFile(path, code);
      }
      return checkerOf({ transport, api: new API({ transport }) });
    }),
  );

export { createChecker };
export type { At, Checker, Completion, Hover, Lint, Severity, Source };
