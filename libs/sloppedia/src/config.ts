import { Option, String as Str, pipe } from "effect";
import type { ReactNode } from "react";

import { AnchorLink } from "./anchor-link.tsx";

type Target =
  | Readonly<{ page: "main" }>
  | Readonly<{ page: "categories" }>
  | Readonly<{ page: "category"; name: string }>
  | Readonly<{ page: "article"; slug: string }>
  | Readonly<{ page: "home" }>;

type LinkProps = Readonly<{
  target: Target;
  href: string;
  className: string;
  children: ReactNode;
}>;

type Labels = Readonly<{
  nav: (name: string) => string;
  mainPage: string;
  categories: string;
  toc: string;
  article: string;
  source: string;
  history: string;
  category: string;
  updated: string;
  recent: string;
  random: string;
  index: string;
  welcome: (name: string) => string;
  count: (count: number) => string;
}>;

type RenderLink = (props: LinkProps) => ReactNode;

type HomeLink = Readonly<{ label: string; href: string }>;

type SloppediaOptions = Readonly<{
  name: string;
  tagline: string;
  basePath: string;
  logoLetter?: string;
  locale?: string;
  labels?: Partial<Labels>;
  home?: HomeLink;
  sourceOf?: (slug: string) => string;
  historyOf?: (slug: string) => string;
  link?: RenderLink;
}>;

type SloppediaConfig = Readonly<{
  name: string;
  tagline: string;
  basePath: string;
  logoLetter: string;
  locale: string;
  labels: Labels;
  home: Option.Option<HomeLink>;
  sourceOf: Option.Option<(slug: string) => string>;
  historyOf: Option.Option<(slug: string) => string>;
  Link: RenderLink;
}>;

const defaultLabels: Labels = {
  nav: (name) => `${name} の案内`,
  mainPage: "メインページ",
  categories: "カテゴリ一覧",
  toc: "目次",
  article: "記事",
  source: "ソースを見る",
  history: "履歴を見る",
  category: "カテゴリ",
  updated: "最終更新",
  recent: "新着記事",
  random: "ランダムピックアップ",
  index: "すべての記事",
  welcome: (name) => `${name}へようこそ`,
  count: (count) => `${String(count)} 本`,
};

const DEFAULT_LOCALE = "ja-JP";

const LOGO_LETTERS = 1;

const defineSloppedia = (options: SloppediaOptions): SloppediaConfig => ({
  name: options.name,
  tagline: options.tagline,
  basePath: options.basePath,
  logoLetter: options.logoLetter ?? pipe(options.name, Str.takeLeft(LOGO_LETTERS)),
  locale: options.locale ?? DEFAULT_LOCALE,
  labels: { ...defaultLabels, ...options.labels },
  home: Option.fromUndefinedOr(options.home),
  sourceOf: Option.fromUndefinedOr(options.sourceOf),
  historyOf: Option.fromUndefinedOr(options.historyOf),
  Link: options.link ?? AnchorLink,
});

const targets = {
  main: { page: "main" },
  categories: { page: "categories" },
  home: { page: "home" },
  category: (name: string): Target => ({ page: "category", name }),
  article: (slug: string): Target => ({ page: "article", slug }),
} as const satisfies Readonly<Record<string, Target | ((key: string) => Target)>>;

type GitHubSource = Readonly<{
  repository: string;
  directory: string;
  branch?: string;
  extension?: string;
}>;

const githubSource = ({
  repository,
  directory,
  branch = "main",
  extension = ".md",
}: GitHubSource): Readonly<{
  sourceOf: (slug: string) => string;
  historyOf: (slug: string) => string;
}> => ({
  sourceOf: (slug) => `${repository}/blob/${branch}/${directory}/${slug}${extension}`,
  historyOf: (slug) => `${repository}/commits/${branch}/${directory}/${slug}${extension}`,
});

export type {
  GitHubSource,
  HomeLink,
  Labels,
  LinkProps,
  RenderLink,
  SloppediaConfig,
  SloppediaOptions,
  Target,
};
export { defaultLabels, defineSloppedia, githubSource, targets };
