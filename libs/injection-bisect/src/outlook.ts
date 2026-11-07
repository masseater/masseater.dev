import MsgReaderModule from "@kenjiuno/msgreader";
import type { FieldsData } from "@kenjiuno/msgreader";
import { Effect, Option, Predicate, String as Str, Array as Arr, pipe } from "effect";
import { escapeText } from "entities/escape";

import { hasStream } from "./cfb.ts";
import type { Document, Reader } from "./parser.ts";
import { ReadError, readErrorOf } from "./read-error.ts";

const PROPERTY_STREAM = "__substg1.0_";

const isMsgReader = (candidate: unknown): candidate is typeof MsgReaderModule =>
  Predicate.isFunction(candidate);

const MsgReader = Option.liftPredicate(MsgReaderModule, Predicate.hasProperty("default")).pipe(
  Option.map(({ default: nested }) => nested),
  Option.filter(isMsgReader),
  Option.getOrElse(() => MsgReaderModule),
);

const presentIn = (parts: readonly (string | null | undefined)[]): string =>
  pipe(
    parts,
    Arr.flatMap((part) => Option.toArray(Option.fromNullishOr(part))),
    Arr.join(" "),
  );

const addressOf = ({ name, email, smtpAddress }: FieldsData): string =>
  presentIn([name, Option.getOrElse(Option.fromNullishOr(smtpAddress), () => email)]);

const headersOf = (fields: FieldsData): readonly string[] => [
  `From: ${presentIn([fields.senderName, fields.senderEmail])}`,
  `To: ${pipe(
    Option.getOrElse(Option.fromNullishOr(fields.recipients), () => []),
    Arr.map((recipient) => addressOf(recipient)),
    Arr.join(", "),
  )}`,
  `Subject: ${Option.getOrElse(Option.fromNullishOr(fields.subject), () => "")}`,
  ...pipe(
    Option.getOrElse(Option.fromNullishOr(fields.attachments), () => []),
    Arr.flatMap(({ fileName }) =>
      Option.toArray(Option.map(Option.fromNullishOr(fileName), (name) => `Attachment: ${name}`)),
    ),
  ),
];

const documentOf = (fields: FieldsData): Document => {
  const headers = pipe(
    headersOf(fields),
    Arr.filter((line) => !Str.endsWith(": ")(line)),
  );
  return Option.match(Option.fromNullishOr(fields.bodyHtml), {
    onSome: (html) => ({
      text: pipe(
        [
          ...pipe(
            headers,
            Arr.map((line) => `<p>${escapeText(line)}</p>`),
          ),
          html,
        ],
        Arr.join("\n"),
      ),
      format: "html",
    }),
    onNone: () => ({
      text: pipe(
        [
          pipe(headers, Arr.join("\n")),
          Option.getOrElse(Option.fromNullishOr(fields.body), () => ""),
        ],
        Arr.join("\n\n"),
        Str.trim,
      ),
      format: "plain",
    }),
  });
};

const outlookReader: Reader = {
  format: "msg",
  extensions: [".msg"],
  accepts: hasStream((name) => Str.startsWith(PROPERTY_STREAM)(name)),
  read: (bytes) =>
    Effect.try({
      try: () =>
        new MsgReader(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)).getFileData(),
      catch: readErrorOf,
    }).pipe(
      Effect.flatMap((fields) =>
        Option.match(Option.fromNullishOr(fields.error), {
          onNone: () => Effect.succeed(documentOf(fields)),
          onSome: (reason) => Effect.fail(ReadError.make({ reason })),
        }),
      ),
    ),
};

export { outlookReader };
