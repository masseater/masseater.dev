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

import type { FuAstType } from "#generated/langium/ast.ts";
import { FuGeneratedModule, FuGeneratedSharedModule } from "#generated/langium/module.ts";

import { compileSong } from "./compile.ts";
import { missingProblemsOf } from "./imports.ts";
import type { From } from "./problem.ts";
import { scopeProviderOf } from "./scope.ts";

export interface FuServices {
  readonly shared: LangiumSharedCoreServices;
  readonly fu: LangiumCoreServices;
}

export const FuModule: Module<LangiumCoreServices, PartialLangiumCoreServices> = {
  references: { ScopeProvider: scopeProviderOf },
};

export const registerChecks: From<LangiumCoreServices, void> = (fu) => {
  const { LangiumDocuments } = fu.shared.workspace;
  const missing = missingProblemsOf((uri) => LangiumDocuments.hasDocument(uri));
  fu.validation.ValidationRegistry.register<FuAstType>({
    Song: (song, accept) => {
      for (const problem of [...missing(song), ...compileSong(song).problems]) {
        accept("error", problem.message, { node: problem.node, property: problem.property });
      }
    },
  });
};

export const createFuServices = (): FuServices => {
  const shared = inject(createDefaultSharedCoreModule(EmptyFileSystem), FuGeneratedSharedModule);
  const fu = inject(createDefaultCoreModule({ shared }), FuGeneratedModule, FuModule);
  shared.ServiceRegistry.register(fu);
  registerChecks(fu);
  return { shared, fu };
};
