import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { escapeText } from "entities/escape";

import { emailOf, emailReader, looksLikeEmail } from "./email.ts";
import type { Document, Reader } from "./parser.ts";

const SEPARATOR = /^From .*\r?\n/mu;

const SEPARATORS = /^From .*\r?\n/gmu;

const FROM_LINE = "From ";

const encoder = new TextEncoder();

const latin1 = new TextDecoder("latin1");

const decoder = new TextDecoder();

const htmlOf = ({ text, format }: Document): string => {
  if (format === "html") {
    return text;
  }
  return pipe(
    text,
    Str.split("\n"),
    Arr.map((line) => `<p>${escapeText(line)}</p>`),
    Arr.join("\n"),
  );
};

const messagesOf = (text: string): readonly string[] =>
  pipe(
    text,
    Str.split(SEPARATORS),
    Arr.filter((message) => Str.trim(message) !== ""),
    Arr.map((message) => Str.replaceAll(/^>(?=>*From )/gmu, "")(message)),
  );

const looksLikeMbox = (bytes: Uint8Array): boolean => {
  const head = latin1.decode(bytes);
  return (
    Str.startsWith(FROM_LINE)(head) &&
    looksLikeEmail(encoder.encode(Str.replace(SEPARATOR, "")(head)))
  );
};

const mboxReader: Reader = {
  format: "mbox",
  extensions: [".mbox", ".mbx"],
  accepts: looksLikeMbox,
  read: (bytes) =>
    Effect.forEach(
      messagesOf(decoder.decode(bytes)),
      (message) => emailOf(encoder.encode(message)),
      {
        concurrency: 1,
      },
    ).pipe(
      Effect.map((documents) => ({
        text: pipe(
          documents,
          Arr.map((document) => htmlOf(document)),
          Arr.join("\n<hr>\n"),
        ),
        format: "html",
      })),
    ),
};

const MAIL_READERS: readonly Reader[] = [mboxReader, emailReader];

export { MAIL_READERS, mboxReader };
