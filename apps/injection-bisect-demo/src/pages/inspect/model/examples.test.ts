import { String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { EXAMPLES } from "./examples";

test("every answer appears once in its example", () => {
  for (const example of EXAMPLES) {
    if (example.kind === "injected") {
      for (const answer of example.answers) {
        expect(Str.indexOf(answer)(example.text)).toStrictEqual(
          Str.lastIndexOf(answer)(example.text),
        );
        expect(example.text).toContain(answer);
      }
    }
  }
});
