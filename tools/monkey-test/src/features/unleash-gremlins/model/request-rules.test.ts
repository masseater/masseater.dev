import { describe, expect, it } from "vite-plus/test";

import { answerOf, carriesBearer } from "./request-rules.ts";

const ORIGIN = "https://site.test";

describe("answerOf", () => {
  it("lets a read through and answers a write without sending it", () => {
    const read = { method: "GET", url: `${ORIGIN}/a`, origin: ORIGIN, isNavigation: false };
    expect(answerOf(read)).toBe("continue");
    expect(answerOf({ ...read, method: "POST" })).toBe("fulfill");
    expect(answerOf({ ...read, method: "delete" })).toBe("fulfill");
  });

  it("stops a navigation to another origin but not a sub-resource", () => {
    const away = { method: "GET", url: "https://other.test/", origin: ORIGIN, isNavigation: true };
    expect(answerOf(away)).toBe("abort");
    expect(answerOf({ ...away, isNavigation: false })).toBe("continue");
  });
});

describe("carriesBearer", () => {
  it("sends the token to the origin under test only", () => {
    const facts = { method: "GET", url: `${ORIGIN}/a`, origin: ORIGIN, isNavigation: false };
    expect(carriesBearer(facts)).toBe(true);
    expect(carriesBearer({ ...facts, url: "https://cdn.test/a.js" })).toBe(false);
  });
});
