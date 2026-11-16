import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { saveProfile } from "#/entities/owner-profile/index.server.ts";
import { renderUserMd } from "#/entities/owner-profile/index.ts";
import type { ProfileLine, ProfileSection, ProfileTopic } from "#/entities/owner-profile/index.ts";
import { TraitTranslator } from "#/entities/trait/index.ts";
import { nowIso } from "#/shared/db/index.server.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

export type ProfileOutcome = "unchanged" | "written" | "rejected";

export type ProfileFailure = StorageFailed | UpstreamFailed;

const BULLET = "- ";

type Block = Readonly<{ title: Option.Option<string>; lines: readonly ProfileLine[] }>;

const textsOf = (block: Block): readonly string[] => [
  ...Option.toArray(block.title),
  ...pipe(
    block.lines,
    Arr.map((line) => line.text),
  ),
];

const translatedLines = (japanese: string): readonly string[] =>
  pipe(
    Str.split(japanese, "\n"),
    Arr.map(Str.trim),
    Arr.filter(Str.startsWith(BULLET)),
    Arr.map(Str.slice(BULLET.length)),
  );

const pairedWith =
  (block: Block) =>
  (texts: readonly string[]): Block => {
    if (texts.length !== textsOf(block).length) {
      return block;
    }
    const titleCount = Number(Option.isSome(block.title));
    const lines = pipe(texts, Arr.drop(titleCount));
    return {
      title: pipe(
        block.title,
        Option.flatMap(() => Arr.head(texts)),
      ),
      lines: pipe(
        lines,
        Arr.zipWith(block.lines, (text, english) => ({ text, refs: english.refs })),
      ),
    };
  };

const bulletsOf = (block: Block): string =>
  pipe(
    textsOf(block),
    Arr.map((text) => `${BULLET}${text}`),
    Arr.join("\n"),
  );

const translateBlock = (block: Block): Effect.Effect<Block, UpstreamFailed, TraitTranslator> =>
  Effect.gen(function* translateOne() {
    if (!Arr.isReadonlyArrayNonEmpty(block.lines)) {
      return block;
    }
    const translator = yield* TraitTranslator;
    const japanese = yield* translator.toJapanese(bulletsOf(block));
    return pairedWith(block)(translatedLines(japanese));
  });

const translateTopic = (
  topic: ProfileTopic,
): Effect.Effect<ProfileTopic, UpstreamFailed, TraitTranslator> =>
  translateBlock({ title: Option.some(topic.title), lines: topic.lines }).pipe(
    Effect.map((block) => ({
      title: Option.getOrElse(block.title, () => topic.title),
      lines: block.lines,
    })),
  );

const translateSection = (
  section: ProfileSection,
): Effect.Effect<ProfileSection, UpstreamFailed, TraitTranslator> =>
  Effect.gen(function* translateWhole() {
    const head = yield* translateBlock({ title: Option.none(), lines: section.lines });
    const topics = yield* pipe(section.topics, Effect.forEach(translateTopic));
    return { title: section.title, lines: head.lines, topics };
  });

export const saveTranslated = ({
  sections,
  sourceHash,
}: Readonly<{
  sections: readonly ProfileSection[];
  sourceHash: string;
}>): Effect.Effect<ProfileOutcome, ProfileFailure, TraitTranslator> =>
  Effect.gen(function* saveWritten() {
    const japanese = yield* pipe(sections, Effect.forEach(translateSection));
    const builtAt = yield* nowIso;
    yield* saveProfile({
      sourceHash,
      markdown: renderUserMd(sections),
      markdownJa: renderUserMd(japanese),
      builtAt,
    });
    return "written" as const;
  });
