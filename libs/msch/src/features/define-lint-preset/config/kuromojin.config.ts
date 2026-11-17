import { createRequire, registerHooks } from "node:module";

export const KUROMOJIN = "kuromojin";
const ON_Y8 = "@r_masseater/y8/kuromojin";

export const requireWithY8Kuromojin = (parentUrl: string): NodeJS.Require => {
  registerHooks({
    resolve: (specifier, context, nextResolve) => {
      if (specifier === KUROMOJIN) {
        return nextResolve(ON_Y8, { ...context, parentURL: import.meta.url });
      }
      return nextResolve(specifier, context);
    },
  });
  return createRequire(parentUrl);
};
