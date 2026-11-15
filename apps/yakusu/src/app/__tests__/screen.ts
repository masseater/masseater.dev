import { page } from "vite-plus/test/browser";

export const source = page.getByRole("textbox", { name: "原文" });

export const output = page.getByRole("status", { name: "訳文" });

export const main = page.getByRole("main");
