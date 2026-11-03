import { wiki } from "#/shared/config";

const WELCOME = `${wiki.name}へようこそ`;

const RECENT_TITLE = "新着記事";

const INDEX_TITLE = "記事の一覧";

const countLine = (count: number): string =>
  `${wiki.tagline}。いまの記事数は ${String(count)} 本である。`;

export { countLine, INDEX_TITLE, RECENT_TITLE, WELCOME };
