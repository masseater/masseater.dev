import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

const ProfileLine = Schema.Struct({ text: Schema.String, refs: Schema.Array(Schema.Int) });

const ProfileSection = Schema.Struct({ title: Schema.String, lines: Schema.Array(ProfileLine) });

export const Profile = Schema.Struct({
  builtAt: Schema.String,
  sections: Schema.Array(ProfileSection),
  sectionsJa: Schema.Array(ProfileSection),
});

export const ProfileSearch = Schema.Struct({
  lang: Schema.optionalKey(Schema.Literal("ja")),
  scope: Schema.optionalKey(Schema.String),
});

export type ProfileValue = typeof Profile.Type;

export type ProfileLineValue = typeof ProfileLine.Type;

export type ProfileSectionValue = typeof ProfileSection.Type;

export type ProfileSearchValue = typeof ProfileSearch.Type;

const SCOPE_MARK = "In ";

const BULLET = "- ";

const scopeOf = (section: ProfileSectionValue): Option.Option<string> =>
  pipe(
    Option.liftPredicate(section.title, Str.startsWith(SCOPE_MARK)),
    Option.map(Str.slice(SCOPE_MARK.length)),
  );

export const scopesOf = (sections: readonly ProfileSectionValue[]): readonly string[] =>
  pipe(sections, Arr.map(scopeOf), Arr.getSomes);

const shownIn =
  (scope: Option.Option<string>) =>
  (section: ProfileSectionValue): boolean =>
    Option.match(scopeOf(section), {
      onNone: () => true,
      onSome: (name) =>
        pipe(scope, Option.match({ onNone: () => true, onSome: (wanted) => wanted === name })),
    });

const languageOf =
  (lang: ProfileSearchValue["lang"]) =>
  (profile: ProfileValue): readonly ProfileSectionValue[] =>
    Option.match(Option.fromUndefinedOr(lang), {
      onNone: () => profile.sections,
      onSome: () => profile.sectionsJa,
    });

export const sectionsOf =
  ({ lang, scope }: ProfileSearchValue) =>
  (profile: ProfileValue): readonly ProfileSectionValue[] => {
    const shown = shownIn(Option.fromUndefinedOr(scope));
    return pipe(languageOf(lang)(profile), Arr.filter(shown));
  };

export const refsLabel = (refs: readonly number[]): string =>
  pipe(refs, Arr.map(String), Arr.join(" "));

const lineText = ({ text, refs }: ProfileLineValue): string =>
  Arr.match(refs, {
    onEmpty: () => `${BULLET}${text}`,
    onNonEmpty: (some) => `${BULLET}${text} [${refsLabel(some)}]`,
  });

const sectionText = (section: ProfileSectionValue): string =>
  pipe(section.lines, Arr.map(lineText), Arr.prepend(`## ${section.title}`), Arr.join("\n"));

export const markdownOf = (sections: readonly ProfileSectionValue[]): string =>
  pipe(sections, Arr.map(sectionText), Arr.prepend("# USER.md"), Arr.join("\n\n"));

export const sectionId = (title: string): string => `section-${encodeURIComponent(title)}`;
