import { Record as Rec } from "effect";
import { expect, test } from "vite-plus/test";

import { withoutCredentials } from "./caller-credentials.ts";

test("keeps the body's type and drops what identifies the caller", () => {
  const request = new Request("https://kikite.test/api/correction", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: "CF_Authorization=session",
      authorization: "Bearer token",
      "cf-access-jwt-assertion": "jwt",
      "cf-access-authenticated-user-email": "owner@example.com",
    },
  });
  expect(Rec.fromEntries(withoutCredentials(request))).toStrictEqual({
    "content-type": "application/json",
  });
});
