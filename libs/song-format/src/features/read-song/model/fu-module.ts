import {
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  EmptyFileSystem,
  inject,
} from "langium";
import type { LangiumCoreServices, LangiumSharedCoreServices } from "langium";

import type { FuAstType } from "#generated/langium/ast.ts";
import { FuGeneratedModule, FuGeneratedSharedModule } from "#generated/langium/module.ts";

import { compileSong } from "./compile.ts";
import type { From } from "./problem.ts";

export interface FuServices {
  readonly shared: LangiumSharedCoreServices;
  readonly fu: LangiumCoreServices;
}

export const registerChecks: From<LangiumCoreServices, void> = (fu) => {
  fu.validation.ValidationRegistry.register<FuAstType>({
    Song: (song, accept) => {
      for (const problem of compileSong(song).problems) {
        accept("error", problem.message, { node: problem.node, property: problem.property });
      }
    },
  });
};

export const createFuServices = (): FuServices => {
  const shared = inject(createDefaultSharedCoreModule(EmptyFileSystem), FuGeneratedSharedModule);
  const fu = inject(createDefaultCoreModule({ shared }), FuGeneratedModule);
  shared.ServiceRegistry.register(fu);
  registerChecks(fu);
  return { shared, fu };
};
