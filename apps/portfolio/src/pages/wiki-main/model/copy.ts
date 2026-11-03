import { wiki } from "#/shared/config";

const WELCOME = `${wiki.name}へようこそ`;

const RECENT_TITLE = "新着記事";

const INDEX_TITLE = "すべての記事";

const countLine = (count: number): string => `記事 ${String(count)} 本`;

export { countLine, INDEX_TITLE, RECENT_TITLE, WELCOME };
