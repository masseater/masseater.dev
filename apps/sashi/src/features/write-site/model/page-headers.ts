import { SECURITY_HEADERS_CREDENTIALLESS, contentSecurityPolicy } from "security-headers";
import { headersFileFor } from "security-headers/static";

const policy = contentSecurityPolicy({ script: [], style: [], image: ["https:"] });

export const pageHeaders = headersFileFor([])({
  documentHeaders: { "Content-Security-Policy": policy },
  pages: [
    {
      path: "/*",
      headers: {
        "Cross-Origin-Embedder-Policy":
          SECURITY_HEADERS_CREDENTIALLESS["Cross-Origin-Embedder-Policy"],
      },
    },
  ],
});
