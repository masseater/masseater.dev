import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { escapeText } from "entities/escape";

import { emailOf, emailReader, looksLikeEmail } from "./email.ts";
import type { Document, Reader, Span, Unreadable } from "./parser.ts";
import { partsInside, withUnreadable } from "./unreadable.ts";

const SEPARATOR = /^From .*\r?\n/mu;

const SEPARATORS = /^From .*\r?\n/gmu;

const ESCAPE = /^>(?=>*From )/gmu;

const FROM_LINE = "From ";

const START = 0;

const NUMBERED_FROM = 1;

const encoder = new TextEncoder();

const latin1 = new TextDecoder("latin1");

interface Message {
  readonly html: readonly string[];
  readonly unreadable: readonly Unreadable[];
}

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

const spansOf = (head: string): readonly Span[] => {
  const separators = Array.from(Str.matchAll(SEPARATORS)(head), (match) => {
    const [line] = match;
    const start = match.index ?? START;
    return { start, end: start + line.length };
  });
  const starts = pipe(
    separators,
    Arr.map(({ end }) => end),
  );
  const ends = pipe(
    separators,
    Arr.map(({ start }) => start),
  );
  return pipe(
    Arr.zip([START, ...starts], [...ends, head.length]),
    Arr.map(([start, end]) => ({ start, end })),
    Arr.filter(({ start, end }) => pipe(head, Str.slice(start, end), Str.trim) !== ""),
  );
};

const messagesOf = (bytes: Uint8Array): readonly Uint8Array[] => {
  const head = latin1.decode(bytes);
  return pipe(
    spansOf(head),
    Arr.map(({ start, end }) => {
      const escaped = Str.matchAll(ESCAPE)(Str.slice(start, end)(head));
      const escapes = new Set(Array.from(escaped, (match) => match.index ?? START));
      return bytes.subarray(start, end).filter((_byte, at) => !escapes.has(at));
    }),
  );
};

const looksLikeMbox = (bytes: Uint8Array): boolean => {
  const head = latin1.decode(bytes);
  return (
    Str.startsWith(FROM_LINE)(head) &&
    looksLikeEmail(encoder.encode(Str.replace(SEPARATOR, "")(head)))
  );
};

const messageOf = (bytes: Uint8Array, index: number): Effect.Effect<Message> => {
  const name = `message ${index + NUMBERED_FROM}`;
  return emailOf(bytes).pipe(
    Effect.map((document) => ({
      html: [htmlOf(document)],
      unreadable: partsInside(name)(document),
    })),
    Effect.catchTag("ReadError", ({ reason }) =>
      Effect.succeed<Message>({ html: [], unreadable: [{ name, reason }] }),
    ),
  );
};

const mboxReader: Reader = {
  format: "mbox",
  extensions: [".mbox", ".mbx"],
  accepts: looksLikeMbox,
  read: (bytes) =>
    Effect.forEach(messagesOf(bytes), messageOf, { concurrency: 1 }).pipe(
      Effect.map((messages) => {
        const unreadable = pipe(
          messages,
          Arr.flatMap((message) => message.unreadable),
        );
        return withUnreadable(unreadable)({
          text: pipe(
            messages,
            Arr.flatMap(({ html }) => html),
            Arr.join("\n<hr>\n"),
          ),
          format: "html",
        });
      }),
    ),
};

const MAIL_READERS: readonly Reader[] = [mboxReader, emailReader];

export { MAIL_READERS, mboxReader };
