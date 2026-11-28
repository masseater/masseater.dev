import { describe, expect, it } from "vite-plus/test";

import { skipTransitionsTo } from "./page-swap.ts";

const skippedOn = (url: string): boolean => {
  const state = { skipped: false };
  skipTransitionsTo(["/feed.xml"])({
    activation: { entry: { url } },
    viewTransition: {
      skipTransition: (): void => {
        state.skipped = true;
      },
    },
  });
  return state.skipped;
};

describe("ページを離れるときの画面遷移", () => {
  it("遷移に加われないファイルへ移るときだけ遷移をやめる", () => {
    expect(skippedOn("https://masseater.dev/feed.xml")).toBe(true);
    expect(skippedOn("https://masseater.dev/slog/")).toBe(false);
  });
});
