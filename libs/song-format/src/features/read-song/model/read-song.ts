import { Array as Arr, Effect, Predicate, Random, pipe } from "effect";
import { URI } from "langium";
import type { Diagnostic } from "vscode-languageserver";

import type { Song } from "#/entities/song/index.ts";
import type { Song as SongNode } from "#generated/langium/ast.ts";

import { compileSong } from "./compile.ts";
import { createFuServices } from "./fu-module.ts";
import type { From } from "./problem.ts";

const FIRST = 1;
const ERROR = 1;

export interface SourceIssue {
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

export type SongSource =
  | { readonly status: "invalid"; readonly issues: readonly SourceIssue[] }
  | { readonly status: "valid"; readonly song: Song };

const services = createFuServices();

const messageOf: From<Diagnostic["message"], string> = (message) => {
  if (Predicate.isString(message)) {
    return message;
  }
  return message.value;
};

export const readSong = Effect.fnUntraced(function* read(
  text: string,
): Effect.fn.Return<SongSource> {
  const id = yield* Random.nextInt;
  const { workspace } = services.shared;
  const document = workspace.LangiumDocumentFactory.fromString<SongNode>(
    text,
    URI.parse(`memory:///${String(id)}.fu`),
  );
  yield* Effect.promise(() => workspace.DocumentBuilder.build([document], { validation: true }));
  workspace.LangiumDocuments.deleteDocument(document.uri);
  const issues = pipe(
    document.diagnostics ?? [],
    Arr.filter((diagnostic) => diagnostic.severity === ERROR),
    Arr.map((diagnostic) => ({
      line: diagnostic.range.start.line + FIRST,
      column: diagnostic.range.start.character + FIRST,
      message: messageOf(diagnostic.message),
    })),
  );
  if (Arr.isReadonlyArrayNonEmpty(issues)) {
    return { status: "invalid", issues };
  }
  return { status: "valid", song: compileSong(document.parseResult.value).value };
});
