import { describe, expect, it } from "vite-plus/test";

import { carriesBearer, shouldAbort } from "./request-rules.ts";

const ORIGIN = "https://site.test";

describe("shouldAbort", () => {
  it("lets a read through and stops a write", () => {
    const read = { method: "GET", url: `${ORIGIN}/a`, origin: ORIGIN, isNavigation: false };
    expect(shouldAbort(read)).toBe(false);
    expect(shouldAbort({ ...read, method: "POST" })).toBe(true);
    expect(shouldAbort({ ...read, method: "delete" })).toBe(true);
  });

  it("stops a navigation to another origin but not a sub-resource", () => {
    const away = { method: "GET", url: "https://other.test/", origin: ORIGIN, isNavigation: true };
    expect(shouldAbort(away)).toBe(true);
    expect(shouldAbort({ ...away, isNavigation: false })).toBe(false);
  });
});

describe("carriesBearer", () => {
  it("sends the token to the origin under test only", () => {
    const facts = { method: "GET", url: `${ORIGIN}/a`, origin: ORIGIN, isNavigation: false };
    expect(carriesBearer(facts)).toBe(true);
    expect(carriesBearer({ ...facts, url: "https://cdn.test/a.js" })).toBe(false);
  });
});
