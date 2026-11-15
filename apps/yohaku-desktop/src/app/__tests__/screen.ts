import { Effect } from "effect";
import { page } from "vite-plus/test/browser";

export const body = page.getByRole("textbox", { name: "本文" });

export const main = page.getByRole("main");

export const settled = Effect.promise(() => document.fonts.ready);
