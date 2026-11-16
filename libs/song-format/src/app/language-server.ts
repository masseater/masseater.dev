import { inject } from "langium";
import { createDefaultModule, createDefaultSharedModule, startLanguageServer } from "langium/lsp";
import { NodeFileSystem } from "langium/node";
import { createConnection, ProposedFeatures } from "vscode-languageserver/node";

import { FumxModule, registerChecks } from "#/features/read-song/index.ts";
import { FumxGeneratedModule, FumxGeneratedSharedModule } from "#generated/langium/module.ts";

export const serveLanguage = (): void => {
  const connection = createConnection(ProposedFeatures.all);
  const shared = inject(
    createDefaultSharedModule({ connection, ...NodeFileSystem }),
    FumxGeneratedSharedModule,
  );
  const fumx = inject(createDefaultModule({ shared }), FumxGeneratedModule, FumxModule);
  shared.ServiceRegistry.register(fumx);
  registerChecks(fumx);
  startLanguageServer(shared);
};
