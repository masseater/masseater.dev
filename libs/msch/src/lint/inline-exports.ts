import { Array as Arr, Option, pipe } from "effect";
import type { Context, ESTree, Plugin, Rule } from "vite-plus/lint/plugins";

import { editsOf } from "./inline-exports-plan.ts";
import { isTypeOnlyClass } from "./inline-exports-resolve.ts";
import { exportListOf } from "./inline-exports-source.ts";
import type { ExportList, Range } from "./inline-exports-source.ts";
import type { Source } from "./inline-exports-text.ts";

const MESSAGE =
  "export は宣言に付ける（export const・export function など）。ファイルの末尾で export { … } にまとめない。";
const START = 0;
const END = 1;

const outside =
  (list: Range) =>
  (range: Range): boolean =>
    range[START] < list[START] || range[END] > list[END];

const usedOutside = (context: Context, list: ExportList): readonly string[] =>
  pipe(
    context.sourceCode.scopeManager.scopes,
    Arr.flatMap((scope) => scope.variables),
    Arr.filter((variable) =>
      pipe(
        variable.references,
        Arr.some((reference) => outside(list.range)(reference.identifier.range)),
      ),
    ),
    Arr.map((variable) => variable.name),
  );

const sourceOf = (context: Context, list: ExportList): Source => ({
  text: context.sourceCode.text,
  comments: pipe(
    context.sourceCode.getAllComments(),
    Arr.map((comment) => comment.range),
  ),
  usedOutside: usedOutside(context, list),
});

const reportList = (
  context: Context,
  node: ESTree.ExportNamedDeclaration,
  list: ExportList,
): void => {
  pipe(
    editsOf(sourceOf(context, list))(list),
    Option.match({
      onNone: () => {
        context.report({ node, message: MESSAGE });
      },
      onSome: (edits) => {
        context.report({
          node,
          message: MESSAGE,
          fix: (fixer) =>
            pipe(
              edits,
              Arr.map((edit) =>
                fixer.replaceTextRange([edit.range[START], edit.range[END]], edit.text),
              ),
            ),
        });
      },
    }),
  );
};

const inlineExports: Rule = {
  meta: { type: "suggestion", fixable: "code" },
  create: (context) => ({
    ExportNamedDeclaration: (node): void => {
      const list = exportListOf(node);
      if (
        Option.isSome(list) &&
        !pipe(list.value.specifiers, Arr.every(isTypeOnlyClass(list.value)))
      ) {
        reportList(context, node, list.value);
      }
    },
  }),
};

const plugin: Plugin & { readonly meta: { readonly name: string } } = {
  meta: { name: "msch-lint" },
  rules: { "inline-exports": inlineExports },
};

export default plugin;
