import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import PostalMime from "postal-mime";
import type { Address } from "postal-mime";

import type { Document, Reader } from "./parser.ts";
import type { ReadError } from "./read-error.ts";
import { readErrorOf } from "./read-error.ts";

type Email = Awaited<ReturnType<typeof PostalMime.parse>>;

const HEAD = { start: 0, end: 4096 } as const;

const HEADER_START = /^[\w-]+:/u;

const FROM = /^From:/imu;

const OTHER_HEADER = /^(?:Subject|Date|To|MIME-Version|Message-ID|Received):/imu;

const latin1 = new TextDecoder("latin1");

const looksLikeEmail = (bytes: Uint8Array): boolean => {
  const head = latin1.decode(bytes.subarray(HEAD.start, HEAD.end));
  return HEADER_START.test(head) && FROM.test(head) && OTHER_HEADER.test(head);
};

const addressOf = (address: Address): string =>
  Option.match(Option.fromNullishOr(address.address), {
    onNone: () => address.name,
    onSome: (mail) => Str.trim(`${address.name} <${mail}>`),
  });

const headerLine = (name: string, value: string): readonly string[] => {
  if (Str.trim(value) === "") {
    return [];
  }
  return [`${name}: ${value}`];
};

const formatOf = (email: Email): string =>
  Option.match(Option.fromNullishOr(email.html), {
    onNone: () => "plain",
    onSome: () => "html",
  });

const documentOf = (email: Email): Document => {
  const from = Option.fromNullishOr(email.from).pipe(Option.map((address) => addressOf(address)));
  const to = Option.fromNullishOr(email.to).pipe(
    Option.map((addresses) =>
      pipe(
        addresses,
        Arr.map((address) => addressOf(address)),
        Arr.join(", "),
      ),
    ),
  );
  const headers = [
    ...headerLine(
      "From",
      Option.getOrElse(from, () => ""),
    ),
    ...headerLine(
      "To",
      Option.getOrElse(to, () => ""),
    ),
    ...headerLine("Subject", email.subject ?? ""),
  ];
  const bodies = Arr.getSomes([Option.fromNullishOr(email.text), Option.fromNullishOr(email.html)]);
  return {
    text: pipe([pipe(headers, Arr.join("\n")), ...bodies], Arr.join("\n\n")),
    format: formatOf(email),
  };
};

const emailOf = (bytes: Uint8Array): Effect.Effect<Document, ReadError> =>
  Effect.tryPromise({
    try: () => PostalMime.parse(bytes),
    catch: readErrorOf,
  }).pipe(Effect.map((email) => documentOf(email)));

const emailReader: Reader = {
  format: "email",
  extensions: [".eml"],
  accepts: looksLikeEmail,
  read: emailOf,
};

export { emailOf, emailReader, looksLikeEmail };
