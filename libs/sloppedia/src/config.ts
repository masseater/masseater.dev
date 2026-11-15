import { Option, String as Str, pipe } from "effect";
import type { ReactNode } from "react";

import { AnchorLink } from "./anchor-link.tsx";

export type Target =
  | Readonly<{ page: "main" }>
  | Readonly<{ page: "categories" }>
  | Readonly<{ page: "category"; name: string }>
  | Readonly<{ page: "article"; slug: string }>
  | Readonly<{ page: "home" }>;

export type LinkProps = Readonly<{
  target: Target;
  href: string;
  className: string;
  children: ReactNode;
}>;

export type Labels = Readonly<{
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
  welcome: (name: string) => string;
  count: (count: number) => string;
}>;

export type RenderLink = (props: LinkProps) => ReactNode;

export type HomeLink = Readonly<{ label: string; href: string }>;

export type SloppediaOptions = Readonly<{
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

export type SloppediaConfig = Readonly<{
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

export const defaultLabels: Labels = {
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
  welcome: (name) => `${name}へようこそ`,
  count: (count) => `${String(count)} 本`,
};

const DEFAULT_LOCALE = "ja-JP";

const LOGO_LETTERS = 1;

export const defineSloppedia = (options: SloppediaOptions): SloppediaConfig => ({
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

export const targets = {
  main: { page: "main" },
  categories: { page: "categories" },
  home: { page: "home" },
  category: (name: string): Target => ({ page: "category", name }),
  article: (slug: string): Target => ({ page: "article", slug }),
} as const satisfies Readonly<Record<string, Target | ((key: string) => Target)>>;

export type GitHubSource = Readonly<{
  repository: string;
  directory: string;
  branch?: string;
  extension?: string;
}>;

export const githubSource = ({
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
