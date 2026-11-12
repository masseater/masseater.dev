import type { Paragraph, Title } from "@masseater.dev/yohaku-protocol";
import { Array, Effect, Option, String, pipe } from "effect";

import { findManuscript, readParagraphs, setTitle } from "#entities/manuscript";
import { dismiss, remarksOf, withoutDismissed } from "#features/remarks";
import { proposeTitle } from "#features/title";

import { found } from "./request-failed.ts";
import { read } from "./understanding.ts";

interface Untitled {
  readonly id: string;
  readonly current: typeof Title.Type | null;
  readonly prose: readonly string[];
}

const AI_TITLE: typeof Title.Type.by = "ai";

const textIn =
  (paragraphs: readonly (typeof Paragraph.Type)[]) =>
  (paragraphId: string): string =>
    pipe(
      paragraphs,
      Array.findFirst(({ id }) => id === paragraphId),
      Option.match({ onNone: () => String.empty, onSome: ({ text }) => text }),
    );

const titled = Effect.fn("titled")(function* titled({ id, current, prose }: Untitled) {
  if (current !== Option.getOrNull(Option.none())) {
    return current;
  }
  const proposed = yield* proposeTitle(prose).pipe(
    Effect.tapError((problem) => Effect.logWarning("title failed", problem)),
    Effect.orElseSucceed(() => String.empty),
  );
  if (String.isEmpty(proposed)) {
    return current;
  }
  const title = { text: proposed, by: AI_TITLE };
  yield* setTitle({ id, title });
  return title;
});

/** @internal */
const annotations = Effect.fn("annotations")(function* annotations(id: string) {
  const manuscript = yield* found(findManuscript(id));
  const paragraphs = yield* readParagraphs(id);
  const { kinds, prose } = yield* read(paragraphs);
  const textOf = textIn(paragraphs);
  const remarks = yield* withoutDismissed({
    remarks: remarksOf(prose),
    textOf: ({ paragraphId }) => textOf(paragraphId),
  });
  const proseTexts = pipe(
    prose,
    Array.map(({ text }) => text),
  );
  const title = yield* titled({ id, current: manuscript.title, prose: proseTexts });
  return { title, kinds, remarks };
});

/** @internal */
const paragraphOf = Effect.fn("paragraphOf")(function* paragraphOf({
  id,
  paragraphId,
}: Readonly<{ id: string; paragraphId: string }>) {
  const paragraphs = yield* readParagraphs(id);
  const paragraph = pipe(
    paragraphs,
    Array.findFirst(({ id: candidate }) => candidate === paragraphId),
  );
  return yield* found(Effect.succeed(paragraph));
});

/** @internal */
const dismissRemark = Effect.fn("dismissRemark")(function* dismissRemark(
  target: Readonly<{ id: string; paragraphId: string }> & { readonly rule: string },
) {
  const paragraph = yield* paragraphOf(target);
  yield* dismiss({ text: paragraph.text, rule: target.rule });
});

export { annotations, dismissRemark, paragraphOf };
