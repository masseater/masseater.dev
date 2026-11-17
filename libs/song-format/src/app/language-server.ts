import {
  FumxModule,
  registerChecks,
  FumxGeneratedModule,
  FumxGeneratedSharedModule,
} from "@r_masseater/fumx-parser/language";
import { inject } from "langium";
import { createDefaultModule, createDefaultSharedModule, startLanguageServer } from "langium/lsp";
import { NodeFileSystem } from "langium/node";
import { createConnection, ProposedFeatures } from "vscode-languageserver/node";

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
