import { Array as Arr, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";

import { useProfile } from "#/pages/profile/api/profile-query.ts";

import { LifeSection } from "./life-section.tsx";
import { PeopleSection } from "./people-section.tsx";
import { ProfileColumn } from "./profile-column.tsx";
import { TraitSection } from "./trait-section.tsx";

const TEXT = {
  recorded: "記録にあること",
  inferred: "AI の推定",
  facts: "わたしについて",
  goals: "続けている目標",
  todos: "やること",
  media: "見ている作品",
} as const;

export const ProfilePage = (): ReactNode => {
  const profile = useProfile();
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <ProfileColumn title={TEXT.recorded}>
        <LifeSection items={profile.ownerFacts} title={TEXT.facts} />
        <LifeSection items={profile.activeGoals} title={TEXT.goals} />
        <LifeSection items={profile.openTodos} title={TEXT.todos} />
        <LifeSection items={profile.recentMedia} title={TEXT.media} />
        <PeopleSection people={profile.people} />
      </ProfileColumn>
      <ProfileColumn title={TEXT.inferred}>
        {pipe(
          Rec.toEntries(profile.traits),
          Arr.map(([kind, traits]) => <TraitSection key={kind} kind={kind} traits={traits} />),
        )}
      </ProfileColumn>
    </div>
  );
};
