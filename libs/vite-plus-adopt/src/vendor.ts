import { Context } from "effect";

const VendorDirectory = Context.Reference<string>("vite-plus-adopt/VendorDirectory", {
  defaultValue: () => `${import.meta.dirname}/../vendor`,
});

export { VendorDirectory };
