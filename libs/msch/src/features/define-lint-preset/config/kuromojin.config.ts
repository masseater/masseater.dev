import { registerHooks } from "node:module";

const KUROMOJIN = "kuromojin";
const ON_Y8 = "@r_masseater/y8/kuromojin";

registerHooks({
  resolve: (specifier, context, nextResolve) => {
    if (specifier === KUROMOJIN) {
      return nextResolve(ON_Y8, { ...context, parentURL: import.meta.url });
    }
    return nextResolve(specifier, context);
  },
});
