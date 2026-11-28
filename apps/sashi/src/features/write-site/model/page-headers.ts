import { Array as Arr, pipe } from "effect";
import { SECURITY_HEADERS_CREDENTIALLESS, contentSecurityPolicy } from "security-headers";
import { headerLines } from "security-headers/static";

const policy = contentSecurityPolicy({ script: [], style: [], image: ["https:"] });

export const pageHeaders = pipe(
  [
    "/*",
    ...headerLines(SECURITY_HEADERS_CREDENTIALLESS),
    `  Content-Security-Policy: ${policy}`,
    "",
  ],
  Arr.join("\n"),
);
