import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { TagList } from "#/entities/entry";

import { AboutCategoryList } from "./about-category-list";
import { AboutRow } from "./about-row";
import { AboutSocialList } from "./about-social-list";

const route = getRouteApi("/");

const TERMS = { categories: "置いているもの", links: "リンク", topics: "よく書く話題" } as const;

const AboutFacts = (): ReactNode => {
  const { topics } = route.useLoaderData();
  return (
    <dl className="flex flex-col gap-6">
      <AboutRow term={TERMS.categories}>
        <AboutCategoryList />
      </AboutRow>
      <AboutRow term={TERMS.links}>
        <AboutSocialList />
      </AboutRow>
      <AboutRow term={TERMS.topics}>
        <TagList tags={topics} />
      </AboutRow>
    </dl>
  );
};

export { AboutFacts };
