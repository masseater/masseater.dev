import { inject } from "langium";
import { createDefaultModule, createDefaultSharedModule, startLanguageServer } from "langium/lsp";
import { NodeFileSystem } from "langium/node";
import { createConnection, ProposedFeatures } from "vscode-languageserver/node";

import { registerChecks } from "#/features/read-song/index.ts";
import { FuGeneratedModule, FuGeneratedSharedModule } from "#generated/langium/module.ts";

export const serveLanguage = (): void => {
  const connection = createConnection(ProposedFeatures.all);
  const shared = inject(
    createDefaultSharedModule({ connection, ...NodeFileSystem }),
    FuGeneratedSharedModule,
  );
  const fu = inject(createDefaultModule({ shared }), FuGeneratedModule);
  shared.ServiceRegistry.register(fu);
  registerChecks(fu);
  startLanguageServer(shared);
};
