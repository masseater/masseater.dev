import { Effect } from "effect";
import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { frontmatter as frontmatterSyntax } from "micromark-extension-frontmatter";

import { ONE } from "#/shared/config/index.ts";

import { readFrontmatter, settingsOf } from "./read-frontmatter.ts";
import { sceneOf } from "./scene.ts";
import type { ScriptError } from "./script-error.ts";
import type { Script } from "./script.ts";
import { sectionsOf } from "./sections.ts";

const FRONTMATTER = "yaml";

export const parseScript = (markdown: string): Effect.Effect<Script, ScriptError> =>
  Effect.gen(function* parseMarkdown() {
    const root = fromMarkdown(markdown, {
      extensions: [frontmatterSyntax([FRONTMATTER])],
      mdastExtensions: [frontmatterFromMarkdown([FRONTMATTER])],
    });
    const frontmatter = yield* readFrontmatter(root.children);
    const sections = yield* sectionsOf(root.children);
    const scenes = yield* Effect.forEach(
      sections,
      (section, position) =>
        sceneOf({
          section,
          position,
          formats: frontmatter.formats,
          isLast: position === sections.length - ONE,
        }),
      { concurrency: "unbounded" },
    );
    return { ...settingsOf(frontmatter), scenes };
  });
