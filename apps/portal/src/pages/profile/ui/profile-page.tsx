import { Array as Arr, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";

import { useProfile } from "#/pages/profile/api/profile-query";

import { LifeSection } from "./life-section";
import { PeopleSection } from "./people-section";
import { TraitSection } from "./trait-section";

const TEXT = {
  facts: "わたしについて",
  goals: "続けている目標",
  todos: "やること",
  media: "見ている作品",
} as const;

const ProfilePage = (): ReactNode => {
  const profile = useProfile();
  return (
    <div className="flex flex-col gap-12">
      <LifeSection items={profile.ownerFacts} title={TEXT.facts} />
      <LifeSection items={profile.activeGoals} title={TEXT.goals} />
      <LifeSection items={profile.openTodos} title={TEXT.todos} />
      <LifeSection items={profile.recentMedia} title={TEXT.media} />
      <PeopleSection people={profile.people} />
      {pipe(
        Rec.toEntries(profile.traits),
        Arr.map(([kind, traits]) => <TraitSection key={kind} kind={kind} traits={traits} />),
      )}
    </div>
  );
};

export { ProfilePage };
