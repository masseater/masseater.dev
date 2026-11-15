import { fileURLToPath } from "node:url";

import treeSitter from "@vscode/tree-sitter-wasm";
import { isComment, isTag, isText } from "domhandler";
import type { AnyNode, Text } from "domhandler";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { DomUtils, parseDocument } from "htmlparser2";

import { dockerfileComments, sqlComments, tomlComments, yamlComments } from "./config-comments.ts";
import { trimmed, unreadable } from "./found-comment.ts";
import type { CommentsUnreadable, Found, FoundComment } from "./found-comment.ts";

const GRAMMARS = [
  "bash",
  "c-sharp",
  "cpp",
  "css",
  "go",
  "java",
  "javascript",
  "php",
  "powershell",
  "ruby",
  "rust",
  "tsx",
  "typescript",
] as const;

type Grammar = (typeof GRAMMARS)[number];

type Markup = "html" | "xml";

type Reader = Grammar | Markup | "yaml" | "toml" | "sql" | "dockerfile";

type Grammars = (grammar: Grammar) => Option.Option<treeSitter.Language>;

const COMMENT_NODES = ["comment", "line_comment", "block_comment", "multiline_comment"];
const START = 0;
const NEXT = 1;
const NONE: readonly FoundComment[] = [];

const grammarFile = (grammar: Grammar): string =>
  fileURLToPath(import.meta.resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${grammar}.wasm`));

const loadGrammar = (
  grammar: Grammar,
): Effect.Effect<readonly [Grammar, treeSitter.Language], CommentsUnreadable> =>
  Effect.tryPromise({
    try: () => treeSitter.Language.load(grammarFile(grammar)),
    catch: unreadable(grammar),
  }).pipe(Effect.map((language) => [grammar, language] as const));

const loadGrammars = Effect.fn("loadGrammars")(function* loadGrammars() {
  yield* Effect.tryPromise({
    try: () => treeSitter.Parser.init(),
    catch: unreadable("javascript"),
  });
  const loaded = yield* pipe(
    GRAMMARS,
    Effect.forEach((grammar) => loadGrammar(grammar)),
  );
  const languages = Rec.fromEntries(loaded);
  const grammars: Grammars = (grammar) => Rec.get(languages, grammar);
  return grammars;
});

const commentNodesIn = (language: treeSitter.Language, source: string): readonly FoundComment[] => {
  const parser = new treeSitter.Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  parser.delete();
  if (tree === null) {
    return NONE;
  }
  const found = pipe(
    tree.rootNode.descendantsOfType(COMMENT_NODES),
    Arr.flatMap((node) => Option.toArray(Option.fromNullishOr(node))),
    Arr.map((node) => trimmed({ index: node.startIndex, text: node.text })),
  );
  tree.delete();
  return found;
};

const syntaxComments =
  (grammars: Grammars, grammar: Grammar) =>
  (source: string): Found =>
    Option.match(grammars(grammar), {
      onNone: () => Effect.fail(unreadable(grammar)("the grammar is not loaded")),
      onSome: (language) =>
        Effect.try({ try: () => commentNodesIn(language, source), catch: unreadable(grammar) }),
    });

const SCRIPT_TYPE = /^(?:|module|text\/javascript|application\/javascript)$/iu;
const SHADER_TYPE = /shader|glsl/iu;

interface EmbeddingTag {
  readonly name: string;
  readonly attribs: Readonly<Record<string, string>>;
}

const scriptGrammar = (attribs: EmbeddingTag["attribs"]): Option.Option<Grammar> => {
  const type = Str.trim(Option.getOrElse(Rec.get(attribs, "type"), () => ""));
  if (Rec.get(attribs, "lang").pipe(Option.contains("ts"))) {
    return Option.some<Grammar>("typescript");
  }
  if (SHADER_TYPE.test(type)) {
    return Option.some<Grammar>("cpp");
  }
  return Option.liftPredicate<Grammar>("javascript", () => SCRIPT_TYPE.test(type));
};

const embeddedGrammar = ({ name, attribs }: EmbeddingTag): Option.Option<Grammar> => {
  if (name === "style") {
    return Option.some<Grammar>("css");
  }
  if (name === "script") {
    return scriptGrammar(attribs);
  }
  return Option.none();
};

const shifted =
  (offset: number) =>
  ({ index, text }: FoundComment): FoundComment => ({ index: index + offset, text });

const markupComment =
  (source: string) =>
  (node: AnyNode): readonly FoundComment[] => {
    if (!isComment(node) || node.startIndex === null || node.endIndex === null) {
      return NONE;
    }
    return [
      { index: node.startIndex, text: Str.slice(node.startIndex, node.endIndex + NEXT)(source) },
    ];
  };

const textComments =
  (grammars: Grammars, grammar: Grammar) =>
  (text: Text): Found => {
    const shift = shifted(text.startIndex ?? START);
    return syntaxComments(grammars, grammar)(text.data).pipe(Effect.map(Arr.map(shift)));
  };

const embeddedComments =
  (grammars: Grammars) =>
  (node: AnyNode): Found => {
    if (!isTag(node)) {
      return Effect.succeed(NONE);
    }
    const texts = pipe(node.children, Arr.filter(isText));
    return Option.match(embeddedGrammar(node), {
      onNone: () => Effect.succeed(NONE),
      onSome: (grammar) =>
        pipe(texts, Effect.forEach(textComments(grammars, grammar)), Effect.map(Arr.flatten)),
    });
  };

const markupComments =
  (grammars: Grammars, markup: Markup) =>
  (source: string): Found =>
    Effect.gen(function* readMarkup() {
      const document = parseDocument(source, {
        xmlMode: markup === "xml",
        withStartIndices: true,
        withEndIndices: true,
      });
      const nodes = DomUtils.filter(() => true, document.children, true);
      const own = pipe(nodes, Arr.flatMap(markupComment(source)));
      if (markup === "xml") {
        return own;
      }
      const embedded = yield* pipe(nodes, Effect.forEach(embeddedComments(grammars)));
      return [...own, ...Arr.flatten(embedded)];
    });

const isGrammar = (reader: Reader): reader is Grammar => pipe(GRAMMARS, Arr.contains(reader));

const commentsWith =
  (grammars: Grammars) =>
  (reader: Reader, source: string): Found => {
    if (isGrammar(reader)) {
      return syntaxComments(grammars, reader)(source);
    }
    const readers = {
      html: markupComments(grammars, "html"),
      xml: markupComments(grammars, "xml"),
      yaml: yamlComments,
      toml: tomlComments,
      sql: sqlComments,
      dockerfile: dockerfileComments,
    } satisfies Record<Exclude<Reader, Grammar>, (text: string) => Found>;
    return readers[reader](source);
  };

export { commentsWith, loadGrammars };
export type { Grammar, Grammars, Markup, Reader };
