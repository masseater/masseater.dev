import {
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  EmptyFileSystem,
  inject,
} from "langium";
import type {
  LangiumCoreServices,
  LangiumSharedCoreServices,
  Module,
  PartialLangiumCoreServices,
} from "langium";

import type { FumxAstType } from "#generated/langium/ast.ts";
import { FumxGeneratedModule, FumxGeneratedSharedModule } from "#generated/langium/module.ts";

import { compileSong } from "./compile.ts";
import { missingProblemsOf } from "./imports.ts";
import type { From } from "./problem.ts";
import { scopeProviderOf } from "./scope.ts";

export interface FumxServices {
  readonly shared: LangiumSharedCoreServices;
  readonly fumx: LangiumCoreServices;
}

export const FumxModule: Module<LangiumCoreServices, PartialLangiumCoreServices> = {
  references: { ScopeProvider: scopeProviderOf },
};

export const registerChecks: From<LangiumCoreServices, void> = (fumx) => {
  const { LangiumDocuments } = fumx.shared.workspace;
  const missing = missingProblemsOf((uri) => LangiumDocuments.hasDocument(uri));
  fumx.validation.ValidationRegistry.register<FumxAstType>({
    Song: (song, accept) => {
      for (const problem of [...missing(song), ...compileSong(song).problems]) {
        accept("error", problem.message, { node: problem.node, property: problem.property });
      }
    },
  });
};

export const createFumxServices = (): FumxServices => {
  const shared = inject(createDefaultSharedCoreModule(EmptyFileSystem), FumxGeneratedSharedModule);
  const fumx = inject(createDefaultCoreModule({ shared }), FumxGeneratedModule, FumxModule);
  shared.ServiceRegistry.register(fumx);
  registerChecks(fumx);
  return { shared, fumx };
};
