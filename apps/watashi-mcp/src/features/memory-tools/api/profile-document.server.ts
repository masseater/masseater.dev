import { Array as Arr, Effect, Option, pipe } from "effect";

import { DOCUMENT_TITLE, inScope, parseUserMd, renderUserMd } from "#/entities/owner-profile";
import type { ProfileSection } from "#/entities/owner-profile";
import { latestProfile } from "#/entities/owner-profile/index.server";
import type { StorageFailed } from "#/shared/db";

const NOT_BUILT = `${DOCUMENT_TITLE}\n\nThe profile has not been built yet.\n`;

export type ProfileDocument = Readonly<{
  builtAt: string;
  sections: readonly ProfileSection[];
  sectionsJa: readonly ProfileSection[];
}>;

const EMPTY: ProfileDocument = { builtAt: "", sections: [], sectionsJa: [] };

export const userMd = (scope: Option.Option<string>): Effect.Effect<string, StorageFailed> =>
  latestProfile.pipe(
    Effect.map(
      Option.match({
        onNone: () => NOT_BUILT,
        onSome: (row) => pipe(parseUserMd(row.markdown), Arr.filter(inScope(scope)), renderUserMd),
      }),
    ),
  );

export const profileDocument: Effect.Effect<ProfileDocument, StorageFailed> = latestProfile.pipe(
  Effect.map(
    Option.match({
      onNone: () => EMPTY,
      onSome: (row) => ({
        builtAt: row.builtAt,
        sections: parseUserMd(row.markdown),
        sectionsJa: parseUserMd(row.markdownJa),
      }),
    }),
  ),
);
