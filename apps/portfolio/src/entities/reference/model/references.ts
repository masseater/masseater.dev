import { referencesOf } from "@masseater.dev/sashi";

export const references = referencesOf(
  import.meta.glob<unknown>("/content/sashi/*.json", { eager: true, import: "default" }),
);
