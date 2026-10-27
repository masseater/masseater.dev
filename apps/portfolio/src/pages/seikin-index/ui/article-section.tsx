import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { articleTitles, blogPath } from "#/entities/technique";
import type { Article } from "#/entities/technique";
import { groupsOf } from "#/pages/seikin-index/model/groups";

import { TechniqueGroup } from "./technique-group";

const ArticleSection = ({ article }: Readonly<{ article: Article }>): ReactNode => (
  <section className="flex flex-col gap-6">
    <h2 className="font-display text-2xl font-light">
      <a className="hover:underline" href={blogPath(article)}>
        {articleTitles[article]}
      </a>
    </h2>
    {pipe(
      groupsOf(article),
      Arr.map((group) => <TechniqueGroup group={group} key={group.name} />),
    )}
  </section>
);

export { ArticleSection };
