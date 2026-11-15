import { Array as Arr, Boolean as Bool, Option, String as Str, pipe } from "effect";

import { isTypeOnly, kindOf, restOf, resolvedOf } from "./inline-exports-resolve.ts";
import type { Resolved } from "./inline-exports-resolve.ts";
import type {
  Declaration,
  ExportList,
  Import,
  ImportBinding,
  Range,
} from "./inline-exports-source.ts";
import {
  commentsBefore,
  indentOf,
  leadingTextOf,
  lineRangeOf,
  textOf,
} from "./inline-exports-text.ts";
import type { Source } from "./inline-exports-text.ts";

export interface Edit {
  readonly range: Range;
  readonly text: string;
}

interface Reexport {
  readonly statement: Import;
  readonly binding: ImportBinding;
  readonly typeOnly: boolean;
}

interface Group {
  readonly statement: Import;
  readonly bindings: readonly ImportBinding[];
  readonly typeOnly: boolean;
}

const NAMESPACE_NAME = "*";
const START = 0;
const END = 1;
const SINGLE = 1;
const NEWLINE = "\n";
const EXPORT = "export ";
const KINDS = [false, true] as const;

const keywordOf = (typeOnly: boolean): string =>
  Bool.match(typeOnly, { onFalse: () => "export", onTrue: () => "export type" });

const reexportsOf = (list: ExportList, resolved: readonly Resolved[]): readonly Reexport[] =>
  pipe(
    resolved,
    Arr.flatMap((entry) =>
      pipe(
        kindOf("import")(entry),
        Arr.map((found) => ({
          statement: found.statement,
          binding: found.binding,
          typeOnly: isTypeOnly(list)(entry.specifier) || found.binding.typeOnly,
        })),
      ),
    ),
  );

const statementsOf = (reexports: readonly Reexport[]): readonly Import[] =>
  pipe(
    reexports,
    Arr.map((entry) => entry.statement),
    Arr.dedupe,
  );

const groupOf =
  (reexports: readonly Reexport[], statement: Import) =>
  (typeOnly: boolean): readonly Group[] => {
    const bindings = pipe(
      reexports,
      Arr.filter((entry) => entry.statement === statement && entry.typeOnly === typeOnly),
      Arr.map((entry) => entry.binding),
    );
    if (Arr.isReadonlyArrayEmpty(bindings)) {
      return [];
    }
    return [{ statement, bindings, typeOnly }];
  };

const splitNamespaces = (group: Group): readonly Group[] => {
  const mixed =
    pipe(
      group.bindings,
      Arr.some((binding) => binding.imported === NAMESPACE_NAME),
    ) && group.bindings.length > SINGLE;
  if (!mixed) {
    return [group];
  }
  return pipe(
    group.bindings,
    Arr.map((binding) => ({ ...group, bindings: [binding] })),
  );
};

const groupsOf = (reexports: readonly Reexport[]): readonly Group[] =>
  pipe(
    statementsOf(reexports),
    Arr.flatMap((statement) => pipe(KINDS, Arr.flatMap(groupOf(reexports, statement)))),
    Arr.flatMap(splitNamespaces),
  );

const renamedOf = (binding: ImportBinding): string =>
  Bool.match(binding.imported === binding.local, {
    onFalse: () => `${binding.imported} as ${binding.local}`,
    onTrue: () => binding.imported,
  });

const reexportTextOf =
  (source: Source) =>
  (group: Group): string => {
    const from = textOf(source)(group.statement.from);
    const keyword = keywordOf(group.typeOnly);
    return pipe(
      group.bindings,
      Arr.findFirst((binding) => binding.imported === NAMESPACE_NAME),
      Option.match({
        onSome: (namespace) => `${keyword} * as ${namespace.local} from ${from};`,
        onNone: () =>
          `${keyword} { ${pipe(group.bindings, Arr.map(renamedOf), Arr.join(", "))} } from ${from};`,
      }),
    );
  };

const replacementOf = (source: Source, list: ExportList, resolved: readonly Resolved[]): string => {
  const rest = restOf(resolved);
  const names = pipe(
    rest,
    Arr.map((specifier) => textOf(source)(specifier.range)),
    Arr.join(", "),
  );
  const remaining = Bool.match(Arr.isReadonlyArrayEmpty(rest), {
    onFalse: () => [`${keywordOf(list.typeOnly)} { ${names} };`],
    onTrue: (): readonly string[] => [],
  });
  const defaults = pipe(
    resolved,
    Arr.flatMap(kindOf("default")),
    Arr.map((found) => `export default ${found.name};`),
  );
  const reexports = pipe(groupsOf(reexportsOf(list, resolved)), Arr.map(reexportTextOf(source)));
  return pipe([...remaining, ...defaults, ...reexports], Arr.join(NEWLINE));
};

const removedOf = (source: Source, reexports: readonly Reexport[]): readonly Import[] =>
  pipe(
    statementsOf(reexports),
    Arr.filter((statement) =>
      pipe(
        statement.bindings,
        Arr.every(
          (binding) =>
            pipe(
              reexports,
              Arr.some((entry) => entry.statement === statement && entry.binding === binding),
            ) && !pipe(source.usedOutside, Arr.contains(binding.local)),
        ),
      ),
    ),
  );

const prefixOf =
  (source: Source, comments: string) =>
  (statement: Declaration): string => {
    const start = statement.range[START];
    if (Str.isEmpty(comments) || pipe(leadingTextOf(source)(start), Str.includes(comments))) {
      return EXPORT;
    }
    return `${comments}${NEWLINE}${indentOf(source)(start)}${EXPORT}`;
  };

const listEditOf = (source: Source, list: ExportList, text: string): Edit => {
  if (!Str.isEmpty(text)) {
    return { range: list.range, text };
  }
  const start = pipe(
    commentsBefore(source)(list.range[START]),
    Arr.head,
    Option.match({ onNone: () => list.range[START], onSome: (first) => first[START] }),
  );
  return { range: lineRangeOf(source)([start, list.range[END]]), text: "" };
};

export const editsOf =
  (source: Source) =>
  (list: ExportList): Option.Option<readonly Edit[]> => {
    const resolved = resolvedOf(list);
    if (restOf(resolved).length === list.specifiers.length) {
      return Option.none();
    }
    const prefix = prefixOf(source, leadingTextOf(source)(list.range[START]));
    const declarations = pipe(
      resolved,
      Arr.flatMap(kindOf("declaration")),
      Arr.flatMap((found) => found.statements),
      Arr.dedupe,
      Arr.map((statement): Edit => ({
        range: [statement.range[START], statement.range[START]],
        text: prefix(statement),
      })),
    );
    const removals = pipe(
      removedOf(source, reexportsOf(list, resolved)),
      Arr.map((statement) => ({ range: lineRangeOf(source)(statement.range), text: "" })),
    );
    return Option.some([
      ...declarations,
      ...removals,
      listEditOf(source, list, replacementOf(source, list, resolved)),
    ]);
  };
