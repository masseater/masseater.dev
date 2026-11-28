import { String as Str } from "effect";

const HTML = "text/html";
const FIRST_SUCCESS = 200;
const LAST_SUCCESS = 299;
const ACCESS_LOGIN_SUFFIX = ".cloudflareaccess.com";

export type RootResponse = Readonly<{ status: number; contentType: string; finalHost: string }>;

export const isPublicPage = (response: RootResponse): boolean =>
  response.status >= FIRST_SUCCESS &&
  response.status <= LAST_SUCCESS &&
  Str.includes(HTML)(response.contentType) &&
  !Str.endsWith(ACCESS_LOGIN_SUFFIX)(response.finalHost);
