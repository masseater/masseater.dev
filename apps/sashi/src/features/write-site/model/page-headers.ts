import { contentSecurityPolicy } from "security-headers";
import { headersFileFor } from "security-headers/static";

const policy = contentSecurityPolicy({ script: [], style: [] });

export const pageHeaders = headersFileFor([])({
  documentHeaders: { "Content-Security-Policy": policy },
  pages: [],
});
