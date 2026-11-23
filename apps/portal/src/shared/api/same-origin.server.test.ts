import { expect, test } from "vite-plus/test";

import { sameOriginWrites } from "./same-origin.server.ts";

const URL = "https://portal.example.com/api/watashi/memos";
const OK = 200;
const FORBIDDEN = 403;

const statusOf = async (method: string, headers: Readonly<Record<string, string>>) => {
  const answered = await sameOriginWrites.options.server?.({
    request: new Request(URL, { method, headers }),
    pathname: "/api/watashi/memos",
    context: {},
    handlerType: "router",
    next: () => ({
      request: new Request(URL),
      pathname: "",
      context: {},
      response: new Response(""),
    }),
  } as never);
  return answered instanceof Response
    ? answered.status
    : (answered as { response: Response }).response.status;
};

test.each([
  {
    name: "a write from another site",
    method: "POST",
    headers: { origin: "https://evil.example" },
    expected: FORBIDDEN,
  },
  {
    name: "a write the browser marks cross-site",
    method: "POST",
    headers: { "sec-fetch-site": "cross-site" },
    expected: FORBIDDEN,
  },
  {
    name: "a write from the portal's own page",
    method: "POST",
    headers: { origin: "https://portal.example.com" },
    expected: OK,
  },
  {
    name: "a write from a client that is not a browser",
    method: "POST",
    headers: {},
    expected: OK,
  },
  {
    name: "a read linked from another site",
    method: "GET",
    headers: { "sec-fetch-site": "cross-site" },
    expected: OK,
  },
])("$name answers $expected", async ({ method, headers, expected }) => {
  expect(await statusOf(method, headers)).toBe(expected);
});
