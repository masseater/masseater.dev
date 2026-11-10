import { Effect } from "effect";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { Figure } from "./figure";
import { importFigures } from "./figure-chunks";

const FRAME = "--cascade-aspect:452 / 840";

const FLOW = "react-flow";

const rendered = (): string =>
  renderToStaticMarkup(<Figure caption="連鎖" name="cascade-failure" />);

test("図を読み込む前は、図と同じ大きさの枠だけを出す", () => {
  const html = rendered();
  expect(html).toContain(FRAME);
  expect(html).not.toContain(FLOW);
});

test("図を読み込んだ後は、図そのものを HTML に出す", () => {
  const html = Effect.andThen(importFigures, Effect.sync(rendered));
  return expect(Effect.runPromise(html)).resolves.toContain(FLOW);
});
