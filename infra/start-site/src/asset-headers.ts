import { Array as Arr, pipe } from "effect";
import { ASSET_CACHE_CONTROL, SECURITY_HEADERS } from "security-headers";
import { headerLines, pageRule } from "security-headers/static";
import type { PageHeaders } from "security-headers/static";

const MAX_RULES = 100;

const assetHeaders = ({
  documentHeaders,
  pages,
}: Readonly<{
  documentHeaders: Readonly<Record<string, string>>;
  pages: readonly PageHeaders[];
}>): string => {
  const rules = [
    ["/*", ...headerLines(SECURITY_HEADERS), ...headerLines(documentHeaders)],
    ...pipe(pages, Arr.map(pageRule)),
    ["/:app/assets/*", `  Cache-Control: ${ASSET_CACHE_CONTROL}`],
  ];
  if (rules.length > MAX_RULES) {
    throw new RangeError(`_headers は ${MAX_RULES} 個までのルールしか持てない: ${rules.length}`);
  }
  return pipe(rules, Arr.flatten, Arr.append(""), Arr.join("\n"));
};

export { assetHeaders };
