import { Array as Arr, String as Str, pipe } from "effect";

import type { Document, Unreadable } from "./parser.ts";

const ITSELF = "";

const NUL = "\0";

export const BINARY = "binary data";

export const itself = (reason: string): Unreadable => ({ name: ITSELF, reason });

const unreadableIn = ({ unreadable = [] }: Pick<Document, "unreadable">): readonly Unreadable[] =>
  unreadable;

export const withUnreadable =
  (unreadable: readonly Unreadable[]) =>
  (document: Document): Document => {
    if (Arr.isReadonlyArrayEmpty(unreadable)) {
      return document;
    }
    return { ...document, unreadable };
  };

export const isBinary = (text: string): boolean => Str.includes(NUL)(text);

const pathIn = (name: string, part: string): string => {
  if (part === ITSELF) {
    return name;
  }
  return `${name}/${part}`;
};

export const partsInside =
  (name: string) =>
  (document: Document): readonly Unreadable[] =>
    pipe(
      unreadableIn(document),
      Arr.map((part) => ({ name: pathIn(name, part.name), reason: part.reason })),
    );

const nameOr = (name: string, part: string): string => {
  if (part === ITSELF) {
    return name;
  }
  return part;
};

export const called =
  (name: string) =>
  (document: Document): Document =>
    withUnreadable(
      pipe(
        unreadableIn(document),
        Arr.map((part) => ({ name: nameOr(name, part.name), reason: part.reason })),
      ),
    )(document);
