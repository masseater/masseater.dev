import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { scopesOf, sectionsOf } from "#/entities/watashi";
import { useProfile } from "#/pages/profile/api/profile-query";

import { ProfileAside } from "./profile-aside";
import { ProfileDocument } from "./profile-document";

const route = getRouteApi("/profile");

export const ProfilePage = (): ReactNode => {
  const profile = useProfile();
  const search = route.useSearch();
  const sections = useMemo(() => sectionsOf(search)(profile), [profile, search]);
  const scopes = useMemo(() => scopesOf(profile.sections), [profile.sections]);
  return (
    <div className="lg:grid-cols-profile grid items-start gap-5">
      <ProfileDocument sections={sections} />
      <ProfileAside builtAt={profile.builtAt} scopes={scopes} sections={sections} />
    </div>
  );
};
