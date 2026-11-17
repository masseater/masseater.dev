import { isComment, isTag, isText } from "domhandler";
import type { AnyNode, Text } from "domhandler";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { DomUtils, parseDocument } from "htmlparser2";

import { loadLanguage, readTree } from "#/shared/lib/tree-sitter.ts";
import type { Language } from "#/shared/lib/tree-sitter.ts";

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

export type Grammar = (typeof GRAMMARS)[number];

export type Markup = "html" | "xml";

export type Reader = Grammar | Markup | "yaml" | "toml" | "sql" | "dockerfile";

export type Grammars = (grammar: Grammar) => Option.Option<Language>;

const COMMENT_NODES = ["comment", "line_comment", "block_comment", "multiline_comment"];
const START = 0;
const NEXT = 1;
const NONE: readonly FoundComment[] = [];

const loadGrammar = (
  grammar: Grammar,
): Effect.Effect<readonly [Grammar, Language], CommentsUnreadable> =>
  loadLanguage(grammar).pipe(
    Effect.mapBoth({
      onFailure: ({ message }) => unreadable(grammar)(message),
      onSuccess: (language) => [grammar, language] as const,
    }),
  );

export const loadGrammars = Effect.fn("loadGrammars")(function* loadGrammars() {
  const loaded = yield* Effect.forEach(GRAMMARS, (grammar) => loadGrammar(grammar), {
    concurrency: 1,
  });
  const languages = Rec.fromEntries(loaded);
  const grammars: Grammars = (grammar) => Rec.get(languages, grammar);
  return grammars;
});

const commentNodesIn = (language: Language, source: string): readonly FoundComment[] =>
  pipe(
    readTree({
      language,
      source,
      read: (root) =>
        pipe(
          root.descendantsOfType(COMMENT_NODES),
          Arr.flatMap((node) => Option.toArray(Option.fromNullishOr(node))),
          Arr.map((node) => trimmed({ index: node.startIndex, text: node.text })),
        ),
    }),
    Option.getOrElse(() => NONE),
  );

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
        pipe(
          texts,
          (items) => Effect.forEach(items, textComments(grammars, grammar), { concurrency: 1 }),
          Effect.map(Arr.flatten),
        ),
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
      const embedded = yield* Effect.forEach(nodes, embeddedComments(grammars), { concurrency: 1 });
      return [...own, ...Arr.flatten(embedded)];
    });

const isGrammar = (reader: Reader): reader is Grammar => pipe(GRAMMARS, Arr.contains(reader));

export const commentsWith =
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
