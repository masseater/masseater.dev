import { failed } from "@masseater.dev/local-server";
import type { Paragraph, Title } from "@masseater.dev/yohaku-protocol";
import { Effect, Option, String } from "effect";

import {
  createManuscript,
  findManuscript,
  listManuscripts,
  readParagraphs,
  saveParagraphs,
  setTitle,
} from "#entities/manuscript";

import type { Handlers } from "./handler-types.ts";
import { found } from "./request-failed.ts";
import { Understanding } from "./understanding.ts";

const WRITER: typeof Title.Type.by = "writer";

interface ById {
  readonly id: string;
}

interface Saving extends ById {
  readonly paragraphs: readonly (typeof Paragraph.Type)[];
}

interface Titling extends ById {
  readonly text: string;
}

const writerTitle = (text: string): typeof Title.Type | null =>
  Option.getOrNull(
    Option.liftPredicate(String.trim(text), String.isNonEmpty).pipe(
      Option.map((trimmed) => ({ text: trimmed, by: WRITER })),
    ),
  );

const manuscriptById = Effect.fn("manuscriptById")(function* manuscriptById(id: string) {
  return yield* found(findManuscript(id));
});

const listed = Effect.fn("listed")(function* listed() {
  const manuscripts = yield* failed(listManuscripts());
  return { manuscripts };
});

const created = Effect.fn("created")(function* created() {
  return yield* failed(createManuscript());
});

const opened = Effect.fn("opened")(function* opened({ id }: ById) {
  const manuscript = yield* manuscriptById(id);
  const paragraphs = yield* failed(readParagraphs(id));
  return { manuscript, paragraphs };
});

const saved = Effect.fn("saved")(function* saved({ id, paragraphs }: Saving) {
  const understanding = yield* Understanding;
  yield* manuscriptById(id);
  yield* failed(saveParagraphs({ id, paragraphs }));
  yield* understanding.changed(id);
});

const titled = Effect.fn("titled")(function* titled({ id, text }: Titling) {
  yield* failed(setTitle({ id, title: writerTitle(text) }));
  return yield* manuscriptById(id);
});

/** @internal */
const manuscriptHandlers = {
  ListManuscripts: listed,
  CreateManuscript: created,
  OpenManuscript: opened,
  SaveParagraphs: saved,
  SetTitle: titled,
} satisfies Pick<
  Handlers,
  "ListManuscripts" | "CreateManuscript" | "OpenManuscript" | "SaveParagraphs" | "SetTitle"
>;

export { manuscriptHandlers };
