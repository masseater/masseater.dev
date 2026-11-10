import {
  InternalSymbolName,
  ModifierFlags,
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
} from "typescript/ast";
import { ModuleKind, ModuleResolutionKind, SymbolFlags, TypeFlags } from "typescript/sync";

import { hasSyntacticModifier } from "./binder-names.ts";
import { escapeLeadingUnderscores, unescapeLeadingUnderscores } from "./binder-symbols.ts";
import { RESOLUTION_VERSION } from "./types-versions.ts";
import { fileFunctions } from "./typescript-files.ts";
import { nodeFunctions } from "./typescript-guards.ts";
import { pathFunctions } from "./typescript-paths.ts";

const ts = {
  ...fileFunctions,
  ...nodeFunctions,
  ...pathFunctions,
  InternalSymbolName,
  ModifierFlags,
  ModuleKind,
  ModuleResolutionKind,
  ScriptKind,
  ScriptTarget,
  SymbolFlags,
  SyntaxKind,
  TypeFlags,
  escapeLeadingUnderscores,
  hasSyntacticModifier,
  unescapeLeadingUnderscores,
  version: RESOLUTION_VERSION,
};

export default ts;
