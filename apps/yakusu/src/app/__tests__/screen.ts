import { page } from "vite-plus/test/browser";

const source = page.getByRole("textbox", { name: "原文" });

const output = page.getByRole("status", { name: "訳文" });

const main = page.getByRole("main");

export { main, output, source };
