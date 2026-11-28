import { expect, it } from "vite-plus/test";

import { isMcpEndpoint } from "./mcp-endpoint.ts";

const OK = 200;
const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const CHALLENGE = 'Bearer realm="OAuth", resource_metadata="https://h.test/.well-known/x/mcp"';

it("recognises an OAuth-protected MCP endpoint by its challenge", () => {
  expect(isMcpEndpoint({ status: UNAUTHORIZED, challenge: CHALLENGE })).toBe(true);
});

it("rejects a plain page, a missing path and an unrelated 401", () => {
  expect(isMcpEndpoint({ status: OK, challenge: "" })).toBe(false);
  expect(isMcpEndpoint({ status: NOT_FOUND, challenge: "" })).toBe(false);
  expect(isMcpEndpoint({ status: UNAUTHORIZED, challenge: 'Basic realm="x"' })).toBe(false);
});
