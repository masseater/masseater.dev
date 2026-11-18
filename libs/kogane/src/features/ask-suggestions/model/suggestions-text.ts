import { Array as Arr, pipe } from "effect";

import type { Suggestion } from "#/shared/api/index.ts";

const HEADING =
  "kogane: these existing workspaces may already do what this prompt needs. Read their AGENTS.md or README before building something new or saying it does not exist.";

/** @internal */
export const suggestionsText = (suggestions: readonly Suggestion[]): string =>
  pipe(
    suggestions,
    Arr.map(
      ({ name, root, directory, description }) =>
        `- ${name} (${root}/${directory}): ${description}`,
    ),
    Arr.prepend(HEADING),
    Arr.join("\n"),
  );
