import { Context } from "effect";

export const VendorDirectory = Context.Reference<string>("vite-plus-adopt/VendorDirectory", {
  defaultValue: () => `${import.meta.dirname}/../vendor`,
});
