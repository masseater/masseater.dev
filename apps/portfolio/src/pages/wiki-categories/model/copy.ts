const TITLE = "カテゴリ一覧";

const headingOf = (name: string): string => `カテゴリ: ${name}`;

const countOf = (count: number): string => `${String(count)} 本`;

export { countOf, headingOf, TITLE };
