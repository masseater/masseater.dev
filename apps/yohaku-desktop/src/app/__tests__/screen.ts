import { Effect } from "effect";
import { page } from "vite-plus/test/browser";

const body = page.getByRole("textbox", { name: "本文" });

const main = page.getByRole("main");

const settled = Effect.promise(async () => {
  await document.fonts.ready;
});

export { body, main, settled };
