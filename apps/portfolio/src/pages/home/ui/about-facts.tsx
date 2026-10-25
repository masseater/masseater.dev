import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { TagList } from "#/entities/entry";

import { AboutEntryList } from "./about-entry-list";
import { AboutRow } from "./about-row";
import { AboutSocialList } from "./about-social-list";

const route = getRouteApi("/");

const TERMS = {
  projects: "作ったもの",
  writings: "最近の記事",
  topics: "よく書く話題",
  links: "リンク",
} as const;

const AboutFacts = (): ReactNode => {
  const { projects, writings, topics } = route.useLoaderData();
  return (
    <dl className="flex flex-col gap-6">
      <AboutRow term={TERMS.projects}>
        <AboutEntryList entries={projects} label="detailed" />
      </AboutRow>
      <AboutRow term={TERMS.writings}>
        <AboutEntryList entries={writings} label="title" />
      </AboutRow>
      <AboutRow term={TERMS.topics}>
        <TagList tags={topics} />
      </AboutRow>
      <AboutRow term={TERMS.links}>
        <AboutSocialList />
      </AboutRow>
    </dl>
  );
};

export { AboutFacts };
