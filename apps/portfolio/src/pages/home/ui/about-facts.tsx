import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { TagList } from "#/entities/entry";

import { AboutProjectList } from "./about-project-list";
import { AboutRow } from "./about-row";
import { AboutSocialList } from "./about-social-list";

const route = getRouteApi("/");

const TERMS = { projects: "作ったもの", topics: "よく書く話題", links: "リンク" } as const;

const AboutFacts = (): ReactNode => {
  const { projects, topics } = route.useLoaderData();
  return (
    <dl className="flex flex-col gap-6">
      <AboutRow term={TERMS.projects}>
        <AboutProjectList projects={projects} />
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
