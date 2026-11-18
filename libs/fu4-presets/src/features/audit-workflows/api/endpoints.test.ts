import { expect, test } from "vite-plus/test";

import { endpointsOf } from "./endpoints.ts";

test.each([
  ["github.com", "https://api.github.com"],
  ["something.ghe.com", "https://api.something.ghe.com"],
  ["selfhosted.example.com", "https://selfhosted.example.com/api/v3"],
])("derives the API base for %s", (host, api) => {
  expect(endpointsOf(host).api).toBe(api);
});
