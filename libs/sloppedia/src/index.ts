export { articlesOf, Frontmatter, InfoboxRowSchema, newestFirst } from "./article.ts";
export type { Article, InfoboxRow } from "./article.ts";
export { byTitle, categoriesOf, recentOf } from "./categories.ts";
export type { WikiCategory } from "./categories.ts";
export { defaultLabels, defineSloppedia, githubSource, targets } from "./config.ts";
export type {
  GitHubSource,
  HomeLink,
  Labels,
  LinkProps,
  RenderLink,
  SloppediaConfig,
  SloppediaOptions,
  Target,
} from "./config.ts";
export { headingsOf, numbered } from "./headings.ts";
export type { Heading, Level, NumberedHeading } from "./headings.ts";
export { ArticleView } from "./article-view.tsx";
export { CategoriesView } from "./categories-view.tsx";
export { MainView } from "./main-view.tsx";
export { WikiLayout } from "./wiki-layout.tsx";
