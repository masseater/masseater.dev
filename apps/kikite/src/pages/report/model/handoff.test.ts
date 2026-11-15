import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, pipe } from "effect";

import { handoffOf } from "./handoff.ts";

describe("handoffOf", () => {
  it("writes the summary as Markdown that can be pasted into a fix request", () => {
    expect(
      handoffOf({
        theme: "kikite を直す",
        points: ["読み上げはいらない", "マイクが途中で切れた"],
        open: [],
        next: ["保存の手段"],
      }),
    ).toBe(
      pipe(
        [
          "# kikite を直す",
          "",
          "## 分かったこと",
          "",
          "- 読み上げはいらない",
          "- マイクが途中で切れた",
          "",
          "## まだ聞いていないこと",
          "",
          "- 保存の手段",
        ],
        Arr.join("\n"),
      ),
    );
  });
});
