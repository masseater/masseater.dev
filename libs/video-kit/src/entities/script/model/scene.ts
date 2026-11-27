import { Array as Arr, Effect, Match, Option, String as Str, pipe } from "effect";
import type { Nodes } from "mdast";

import type { Format } from "#/shared/config/index.ts";
import { NOTHING, ONE } from "#/shared/config/index.ts";

import { attributesOf } from "./attributes.ts";
import type { Body } from "./body.ts";
import { bodyOf } from "./body.ts";
import { headingSegments, linesOf, textOfNodes } from "./phrasing.ts";
import type { ScriptError } from "./script-error.ts";
import { errorAt } from "./script-error.ts";
import type { Line, Scene, Segment } from "./script.ts";
import type { Section } from "./sections.ts";

const NEWLINE = "\n";
const EMPTY = "";
const BOOKEND_ONLY = "`#` の見出しは最初（タイトル）と最後（締め）にだけ書ける";
const ONE_BODY = "1 つのシーンに箇条書き・コード・素材・引用は 1 つまで。`##` で分ける";
const NO_LINES: readonly Line[] = [];

export interface SceneRequest {
  readonly section: Section;
  readonly position: number;
  readonly formats: readonly Format[];
  readonly isLast: boolean;
}

type Base = Readonly<{ id: string; formats: readonly Format[]; fixedSeconds?: number }>;

interface Parts {
  readonly base: Base;
  readonly heading: readonly Segment[];
  readonly narration: readonly Line[];
}

type Found = Readonly<{ block: Nodes; body: Body }>;

const baseOf = ({ section, position, formats }: SceneRequest): Base => {
  const attributes = attributesOf(textOfNodes(section.title));
  return {
    id: Option.getOrElse(attributes.id, () => `scene-${String(position + ONE)}`),
    formats: Option.match(attributes.only, { onNone: () => formats, onSome: (only) => [only] }),
    ...Option.match(attributes.fixedSeconds, {
      onNone: () => ({}),
      onSome: (fixedSeconds) => ({ fixedSeconds }),
    }),
  };
};

const narrationOf = (blocks: readonly Nodes[]): readonly Line[] =>
  pipe(
    blocks,
    Arr.flatMap((block) => {
      if (block.type === "paragraph" && Option.isNone(bodyOf(block))) {
        return linesOf({ nodes: block.children, caption: true });
      }
      return NO_LINES;
    }),
  );

const bodiesOf = (blocks: readonly Nodes[]): readonly Found[] =>
  pipe(
    blocks,
    Arr.flatMap((block) =>
      pipe(
        bodyOf(block),
        Option.map((body) => ({ block, body })),
        Option.toArray,
      ),
    ),
  );

const itemsOf = (body: Body): readonly Line[] => {
  if (body.kind === "points") {
    return body.items;
  }
  return NO_LINES;
};

const bookendOf = (
  request: SceneRequest,
  { base, heading, narration }: Parts,
  bodies: readonly Found[],
): Effect.Effect<Scene, ScriptError> => {
  if (request.position === NOTHING) {
    const items = pipe(
      Arr.head(bodies),
      Option.map(({ body }) => itemsOf(body)),
      Option.getOrElse(() => NO_LINES),
    );
    return Effect.succeed({ ...base, kind: "title", title: heading, items, lines: narration });
  }
  if (request.isLast) {
    return Effect.succeed({ ...base, kind: "ending", title: heading, lines: narration });
  }
  return Effect.fail(errorAt({ node: request.section.anchor, message: BOOKEND_ONLY }));
};

const quoteLine = (text: string): Line => ({
  segments: [{ text: Str.replaceAll(NEWLINE, EMPTY)(text), code: false, emphasis: false }],
  caption: false,
});

const fromBody = ({ base, heading, narration }: Parts, body: Body): Scene =>
  Match.value<Body>(body).pipe(
    Match.discriminatorsExhaustive("kind")({
      points: ({ items }): Scene => ({ ...base, kind: "points", heading, items, lines: narration }),
      code: ({ code }): Scene => ({ ...base, kind: "code", heading, code, lines: narration }),
      media: ({ src, alt }): Scene => ({
        ...base,
        kind: "media",
        heading,
        src,
        alt,
        lines: narration,
      }),
      rating: ({ score, max }): Scene => ({
        ...base,
        kind: "rating",
        heading,
        score,
        max,
        lines: narration,
      }),
      quote: ({ text, source }): Scene => ({
        ...base,
        kind: "quote",
        text,
        ...Option.match(source, { onNone: () => ({}), onSome: (name) => ({ source: name }) }),
        lines: [quoteLine(text), ...narration],
      }),
    }),
  );

const sectionSceneOf = (
  parts: Parts,
  bodies: readonly Found[],
): Effect.Effect<Scene, ScriptError> =>
  pipe(
    Arr.get(bodies, ONE),
    Option.match({
      onSome: ({ block }) => Effect.fail(errorAt({ node: block, message: ONE_BODY })),
      onNone: () =>
        Effect.succeed(
          Option.match(Arr.head(bodies), {
            onNone: (): Scene => ({
              ...parts.base,
              kind: "talk",
              heading: parts.heading,
              lines: parts.narration,
            }),
            onSome: ({ body }) => fromBody(parts, body),
          }),
        ),
    }),
  );

export const sceneOf = (request: SceneRequest): Effect.Effect<Scene, ScriptError> => {
  const { section } = request;
  const parts: Parts = {
    base: baseOf(request),
    heading: headingSegments(section.title),
    narration: narrationOf(section.blocks),
  };
  const bodies = bodiesOf(section.blocks);
  if (section.depth === ONE) {
    return bookendOf(request, parts, bodies);
  }
  return sectionSceneOf(parts, bodies);
};
