import { describe, expect, it } from "vite-plus/test";

import { isPublicPage } from "./page-host.ts";

const OK = 200;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;

const page = { status: OK, contentType: "text/html; charset=utf-8", finalHost: "site.test" };

describe("isPublicPage", () => {
  it("accepts an HTML root that answers without a login", () => {
    expect(isPublicPage(page)).toBe(true);
  });

  it("skips an API, an error and a page behind the Access login", () => {
    expect(isPublicPage({ ...page, contentType: "application/json" })).toBe(false);
    expect(isPublicPage({ ...page, status: NOT_FOUND })).toBe(false);
    expect(isPublicPage({ ...page, status: UNAUTHORIZED })).toBe(false);
    expect(isPublicPage({ ...page, finalHost: "team.cloudflareaccess.com" })).toBe(false);
  });
});
