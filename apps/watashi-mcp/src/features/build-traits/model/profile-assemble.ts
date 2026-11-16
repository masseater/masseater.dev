import { Array as Arr, HashSet, Option, Record as Rec, String as Str, pipe } from "effect";

import type { ProfileSection, ProfileTopic } from "#/entities/owner-profile/index.ts";

import type {
  EditedSectionValue,
  EditedValue,
  ItemValue,
  Rule,
  RuleSection,
} from "./profile-outline.ts";
import {
  bareOf,
  heaviestFirst,
  idsOf,
  linesOfPlaced,
  lookupOf,
  placedOf,
  sumOf,
} from "./profile-placed.ts";
import type { Lookup, Placed } from "./profile-placed.ts";

const SINGLE = 1;

const KEEP_WEIGHT = 3;

const OTHER_TOPIC = "Other";

const SCOPE_MARK = "In ";

const SHARED_TITLES = {
  limits: "Hard limits",
  work: "How to work with me",
  communication: "Communication",
} as const;

const SHARED_ORDER: readonly string[] = [
  SHARED_TITLES.limits,
  SHARED_TITLES.work,
  SHARED_TITLES.communication,
];

type Group = Readonly<{ title: string; placed: readonly Placed[] }>;

type Titled = readonly (readonly [string, Group])[];

type Built = Readonly<{ section: ProfileSection; weight: number }>;

const placedWeight = sumOf((placed: Placed) => placed.weight);

const groupWeight = (group: Group): number => placedWeight(group.placed);

const scopeTitle = (repo: string): string => `${SCOPE_MARK}${Str.trim(repo)}`;

const titleOfRule = (section: RuleSection, repo: string): Option.Option<string> => {
  if (section === "repo") {
    return pipe(Option.liftPredicate(repo, Str.isNonEmpty), Option.map(scopeTitle));
  }
  if (section === "who") {
    return Option.none();
  }
  return Option.some(SHARED_TITLES[section]);
};

const topicGroup =
  (lookup: Lookup, title: string) =>
  (topic: EditedSectionValue["topics"][number]): readonly [string, Group] => {
    const placed = pipe(topic.items, Arr.map(placedOf(lookup)), Arr.getSomes);
    return [title, { title: Str.trim(topic.title), placed }] as const;
  };

const groupsOf =
  (lookup: Lookup) =>
  (section: EditedSectionValue): Titled =>
    pipe(
      titleOfRule(section.section, Str.trim(section.repo)),
      Option.match({
        onNone: (): Titled => [],
        onSome: (title) => pipe(section.topics, Arr.map(topicGroup(lookup, title))),
      }),
    );

const rescuedGroup = (rule: Rule): Group => ({
  title: OTHER_TOPIC,
  placed: [{ line: { text: rule.rule, refs: rule.refs }, weight: rule.weight, ids: [rule.id] }],
});

const isForgotten =
  (used: HashSet.HashSet<number>) =>
  (rule: Rule): boolean =>
    rule.weight >= KEEP_WEIGHT && !HashSet.has(used, rule.id);

const rescuedOf =
  (used: HashSet.HashSet<number>) =>
  (rule: Rule): Titled =>
    pipe(
      Option.liftPredicate(rule, isForgotten(used)),
      Option.flatMap((kept) => titleOfRule(kept.section, kept.repo)),
      Option.match({
        onNone: (): Titled => [],
        onSome: (title) => [[title, rescuedGroup(rule)] as const],
      }),
    );

const joined = (same: Arr.NonEmptyReadonlyArray<Group>): Group => ({
  title: Arr.headNonEmpty(same).title,
  placed: pipe(
    same,
    Arr.flatMap((group) => group.placed),
    heaviestFirst((placed: Placed) => placed.weight),
  ),
});

const joinedGroups = (groups: readonly Group[]): readonly Group[] =>
  pipe(
    groups,
    Arr.groupBy((group) => Str.toLowerCase(group.title)),
    Rec.values,
    Arr.map(joined),
    Arr.filter((group) => Arr.isReadonlyArrayNonEmpty(group.placed)),
    heaviestFirst(groupWeight),
  );

const topicOf = (group: Group): ProfileTopic => ({
  title: group.title,
  lines: linesOfPlaced(group.placed),
});

const sectionOf = (title: string, groups: readonly Group[]): ProfileSection => {
  if (groups.length === SINGLE) {
    const placed = pipe(
      groups,
      Arr.flatMap((group) => group.placed),
    );
    return { title, lines: linesOfPlaced(placed), topics: [] };
  }
  return { title, lines: [], topics: pipe(groups, Arr.map(topicOf)) };
};

const builtOf = (entries: Titled, title: string): Built => {
  const groups = pipe(
    entries,
    Arr.map(([, group]) => group),
    joinedGroups,
  );
  return { section: sectionOf(title, groups), weight: sumOf(groupWeight)(groups) };
};

const isShared = (title: string): boolean => pipe(SHARED_ORDER, Arr.contains(title));

const orderedSections = (built: Readonly<Record<string, Built>>): readonly ProfileSection[] => {
  const shared = pipe(
    SHARED_ORDER,
    Arr.map((title) => Rec.get(built, title)),
    Arr.getSomes,
  );
  const scoped = pipe(
    Rec.toEntries(built),
    Arr.filter(([title]) => !isShared(title)),
    Arr.map(([, one]) => one),
    heaviestFirst((one: Built) => one.weight),
  );
  return pipe(
    [...shared, ...scoped],
    Arr.map((one) => one.section),
  );
};

const whoItem =
  (lookup: Lookup, bare: boolean) =>
  (item: ItemValue): readonly Placed[] =>
    pipe(
      placedOf(lookup)(item),
      Option.orElse(() => Option.liftPredicate(bareOf(item), () => bare)),
      Option.toArray,
    );

const plain = (title: string, texts: readonly string[]): ProfileSection => ({
  title,
  lines: pipe(
    texts,
    Arr.map((text) => ({ text, refs: [] })),
  ),
  topics: [],
});

const hasContent = (section: ProfileSection): boolean =>
  Arr.isReadonlyArrayNonEmpty(section.lines) || Arr.isReadonlyArrayNonEmpty(section.topics);

export type Assembled = Readonly<{
  sections: readonly ProfileSection[];
  used: number;
  rescued: number;
}>;

export type AssembleInput = Readonly<{
  rules: readonly Rule[];
  edited: EditedValue;
  bare: boolean;
}>;

export const assemble = ({ rules, edited, bare }: AssembleInput): Assembled => {
  const lookup = lookupOf(rules);
  const who = pipe(edited.who, Arr.flatMap(whoItem(lookup, bare)));
  const titled = pipe(edited.sections, Arr.flatMap(groupsOf(lookup)));
  const grouped = pipe(
    titled,
    Arr.flatMap(([, group]) => group.placed),
  );
  const used = HashSet.fromIterable([...idsOf(who), ...idsOf(grouped)]);
  const rescued = pipe(rules, Arr.flatMap(rescuedOf(used)));
  const built = pipe(
    [...titled, ...rescued],
    Arr.groupBy(([title]) => title),
    Rec.map(builtOf),
  );
  const sections = [
    plain("Summary", edited.summary),
    { title: "Who", lines: linesOfPlaced(who), topics: [] },
    plain("Now", edited.now),
    ...orderedSections(built),
  ];
  return {
    sections: pipe(sections, Arr.filter(hasContent)),
    used: HashSet.size(used),
    rescued: rescued.length,
  };
};
