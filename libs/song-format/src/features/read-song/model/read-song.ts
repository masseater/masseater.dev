import { Array as Arr, Effect, Option, Predicate, pipe } from "effect";
import { URI } from "langium";
import type { LangiumDocument } from "langium";
import type { Diagnostic } from "vscode-languageserver";

import type { Song } from "#/entities/song/index.ts";
import { isSong } from "#generated/langium/ast.ts";
import type { Song as SongNode } from "#generated/langium/ast.ts";

import { compileSong } from "./compile.ts";
import { createFuServices } from "./fu-module.ts";
import type { FuServices } from "./fu-module.ts";
import type { From } from "./problem.ts";
import { importedUriOf } from "./scope.ts";

const FIRST = 1;
const ERROR = 1;

export interface SourceIssue {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

export type SongSource =
  | { readonly status: "invalid"; readonly issues: readonly SourceIssue[] }
  | { readonly status: "valid"; readonly song: Song };

export interface SongFiles<Failure> {
  readonly path: string;
  readonly read: (path: string) => Effect.Effect<string, Failure>;
}

const messageOf: From<Diagnostic["message"], string> = (message) => {
  if (Predicate.isString(message)) {
    return message;
  }
  return message.value;
};

type Reader = From<string, Effect.Effect<Option.Option<string>>>;

const loader: From<FuServices, From<Reader, From<URI, Effect.Effect<void>>>> =
  (services) => (read) => {
    const { LangiumDocuments, LangiumDocumentFactory } = services.shared.workspace;
    const load: From<URI, Effect.Effect<void>> = (uri) =>
      Effect.gen(function* loadDocument() {
        if (LangiumDocuments.hasDocument(uri)) {
          return;
        }
        const text = yield* read(uri.fsPath);
        if (Option.isNone(text)) {
          return;
        }
        const document = LangiumDocumentFactory.fromString<SongNode>(text.value, uri);
        LangiumDocuments.addDocument(document);
        yield* Effect.forEach(
          document.parseResult.value.imports,
          (node) => load(importedUriOf(node)),
          { discard: true },
        );
      });
    return load;
  };

const issuesOf: From<LangiumDocument, readonly SourceIssue[]> = (document) =>
  pipe(
    document.diagnostics ?? [],
    Arr.filter((diagnostic) => diagnostic.severity === ERROR),
    Arr.map((diagnostic) => ({
      path: document.uri.fsPath,
      line: diagnostic.range.start.line + FIRST,
      column: diagnostic.range.start.character + FIRST,
      message: messageOf(diagnostic.message),
    })),
  );

const builtOf: From<FuServices, From<URI, Effect.Effect<SongSource>>> = (services) => (entry) =>
  Effect.gen(function* build() {
    const { workspace } = services.shared;
    const documents = workspace.LangiumDocuments.all.toArray();
    yield* Effect.promise(() => workspace.DocumentBuilder.build(documents, { validation: true }));
    const issues = pipe(documents, Arr.flatMap(issuesOf));
    if (Arr.isReadonlyArrayNonEmpty(issues)) {
      return { status: "invalid", issues };
    }
    return pipe(
      Option.fromNullishOr(workspace.LangiumDocuments.getDocument(entry)),
      Option.map((document) => document.parseResult.value),
      Option.filter(isSong),
      Option.match({
        onNone: (): SongSource => ({ status: "invalid", issues: [] }),
        onSome: (song): SongSource => ({ status: "valid", song: compileSong(song).value }),
      }),
    );
  });

export const readSong = Effect.fnUntraced(function* read<Failure>(
  files: SongFiles<Failure>,
): Effect.fn.Return<SongSource> {
  const services = createFuServices();
  const entry = URI.file(files.path);
  yield* loader(services)((path) => Effect.option(files.read(path)))(entry);
  if (!services.shared.workspace.LangiumDocuments.hasDocument(entry)) {
    return {
      status: "invalid",
      issues: [{ path: files.path, line: FIRST, column: FIRST, message: "ファイルを読めません" }],
    };
  }
  return yield* builtOf(services)(entry);
});
