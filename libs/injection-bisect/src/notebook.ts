import {
  isCode,
  isDisplayData,
  isError,
  isExecuteResult,
  isMarkdown,
  isStream,
} from "@jupyterlab/nbformat";
import type {
  ICell,
  IDisplayData,
  IExecuteResult,
  INotebookContent,
  IOutput,
  MultilineString,
} from "@jupyterlab/nbformat";
import { Effect, Match, Option, Predicate, Result, Schema, Array as Arr, pipe } from "effect";

import type { Document, Reader } from "./parser.ts";
import { readErrorOf } from "./read-error.ts";

const isNotebook = (value: unknown): value is INotebookContent =>
  Predicate.hasProperty(value, "nbformat") &&
  Predicate.hasProperty(value, "cells") &&
  Arr.isArray(value.cells);

const NotebookFromJson = Schema.fromJsonString(Schema.declare(isNotebook));

const decodeNotebook = Schema.decodeUnknownEffect(NotebookFromJson);

const notebookResultOf = Schema.decodeUnknownResult(NotebookFromJson);

const DEFAULT_LANGUAGE = "python";

const OUTPUT_TYPES = [
  ["text/plain", "output"],
  ["text/markdown", "output"],
  ["text/html", "html"],
] as const;

const decoder = new TextDecoder();

const isLines = (value: unknown): value is MultilineString =>
  Predicate.isString(value) ||
  (Arr.isArray(value) &&
    pipe(
      value,
      Arr.every((line) => Predicate.isString(line)),
    ));

const joined = (lines: MultilineString): string => pipe([lines].flat(), Arr.join(""));

const fenced =
  (language: string) =>
  (lines: MultilineString): string =>
    `\`\`\`${language}\n${joined(lines)}\n\`\`\``;

const mimeText = ({ data }: IDisplayData | IExecuteResult): readonly string[] =>
  pipe(
    OUTPUT_TYPES,
    Arr.flatMap(([type, language]) =>
      Option.toArray(Option.map(Option.liftPredicate(data[type], isLines), fenced(language))),
    ),
  );

const outputText = (output: IOutput): readonly string[] =>
  Match.value(output).pipe(
    Match.when(isStream, ({ text }) => [fenced("output")(text)]),
    Match.when(isError, ({ ename, evalue }) => [fenced("output")(`${ename}: ${evalue}`)]),
    Match.when(isExecuteResult, mimeText),
    Match.when(isDisplayData, mimeText),
    Match.orElse(() => []),
  );

const cellText =
  (language: string) =>
  (cell: ICell): readonly string[] => {
    if (isMarkdown(cell)) {
      return [joined(cell.source)];
    }
    if (isCode(cell)) {
      return [fenced(language)(cell.source), ...pipe(cell.outputs, Arr.flatMap(outputText))];
    }
    return [fenced("output")(cell.source)];
  };

const languageOf = ({ metadata }: INotebookContent): string =>
  Option.fromNullishOr(metadata.language_info).pipe(
    Option.map(({ name }) => name),
    Option.getOrElse(() => DEFAULT_LANGUAGE),
  );

const markdownOf = (notebook: INotebookContent): string => {
  const textOfCell = cellText(languageOf(notebook));
  return pipe(notebook.cells, Arr.flatMap(textOfCell), Arr.join("\n\n"));
};

const notebookReader: Reader = {
  format: "ipynb",
  extensions: [".ipynb"],
  accepts: (bytes) => Result.isSuccess(notebookResultOf(decoder.decode(bytes))),
  read: (bytes) =>
    decodeNotebook(decoder.decode(bytes)).pipe(
      Effect.flatMap((notebook) =>
        Effect.try({
          try: (): Document => ({ text: markdownOf(notebook), format: "markdown" }),
          catch: readErrorOf,
        }),
      ),
      Effect.mapError(readErrorOf),
    ),
};

export { notebookReader };
