import { expect, test, vi } from "vite-plus/test";

import { watashiRoutes } from "./watashi-routes.server.ts";

vi.mock("cloudflare:workers", () => ({
  env: {
    WATASHI: {
      memoryWrite: () => Promise.resolve({ status: "ok", body: { written: ["notes/today"] } }),
    },
  },
}));

const OK = 200;
const EDIT = JSON.stringify({
  project: "notes",
  name: "today",
  description: "a memo",
  content: "text",
});

const FORM = "project=notes&name=today&description=a+memo&content=text";

const write = async (contentType: string, body: string): Promise<number> => {
  const { status } = await watashiRoutes.handle(
    new Request("https://portal.example.com/api/watashi/memos", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    }),
  );
  return status;
};

test("writes a memo sent as JSON", () => expect(write("application/json", EDIT)).resolves.toBe(OK));

test("refuses a memo sent the way an HTML form sends it", () =>
  expect(write("application/x-www-form-urlencoded", FORM)).resolves.not.toBe(OK));
