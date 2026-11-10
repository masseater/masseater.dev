import { Array as Arr, Predicate, pipe } from "effect";
import type { JSDocCallbackTag, JSDocTag, JSDocTypedefTag, Node } from "typescript/ast";
import { isIdentifier, isJSDoc, isJSDocCallbackTag, isJSDocTypedefTag } from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { declareBlockScoped } from "./binder-declarations.ts";
import type { FileBinding, SymbolFlagPair } from "./binder-declarations.ts";
import { blockScopeIsFile, containerIsFile } from "./binder-scopes.ts";

type TypeAliasTag = JSDocCallbackTag | JSDocTypedefTag;

interface TypeAliasTagSite {
  readonly tag: TypeAliasTag;
  readonly host: Node;
}

const TYPE_ALIAS: SymbolFlagPair = {
  includes: SymbolFlags.TypeAlias,
  excludes: SymbolFlags.TypeAliasExcludes,
};

const NO_TAGS: readonly JSDocTag[] = [];

const isTypeAliasTag = (tag: JSDocTag): tag is TypeAliasTag =>
  isJSDocTypedefTag(tag) || isJSDocCallbackTag(tag);

const typeAliasTagsOf = (host: Node): readonly TypeAliasTag[] =>
  pipe(
    host.jsDoc ?? [],
    Arr.filter(isJSDoc),
    Arr.flatMap((doc) => pipe(doc.tags ?? NO_TAGS, Arr.filter(isTypeAliasTag))),
  );

const typeAliasTagSites = (hosts: readonly Node[]): readonly TypeAliasTagSite[] =>
  Arr.dedupeWith(
    hosts.flatMap((host) => typeAliasTagsOf(host).map((tag) => ({ tag, host }))),
    (left, right) => left.tag.pos === right.tag.pos,
  );

const declaresFileTypeAlias = (site: TypeAliasTagSite): boolean =>
  Predicate.isNotUndefined(site.tag.name) &&
  isIdentifier(site.tag.name) &&
  containerIsFile(site.host) &&
  blockScopeIsFile(site.host);

const bindJSDocTypeAliases = (binding: FileBinding, hosts: readonly Node[]): void => {
  for (const site of typeAliasTagSites(hosts)) {
    if (declaresFileTypeAlias(site)) {
      declareBlockScoped(binding, site.tag, TYPE_ALIAS);
    }
  }
};

export { bindJSDocTypeAliases };
