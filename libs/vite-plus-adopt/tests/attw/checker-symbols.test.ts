import { layer } from "@effect/vitest";
import { deepStrictEqual } from "@effect/vitest/utils";
import { Effect, Layer, Option, Array as Arr, pipe } from "effect";
import { ModuleResolutionKind } from "typescript/sync";

import { Package } from "#src/attw.ts";
import { exportOf } from "#src/attw/binder-symbols.ts";
import type { BoundSymbol } from "#src/attw/binder-symbols.ts";
import { bindSourceFile, bindingOf } from "#src/attw/binder.ts";
import { createCompilerHostWrapperWith } from "#src/attw/compiler-hosts.ts";
import { toJson } from "#src/json.ts";

const ENTRY = "/node_modules/sizes/index.ts";

const sizesPackage = (): Package =>
  new Package(
    {
      "/node_modules/sizes/package.json": toJson({ name: "sizes", version: "1.0.0" }),
      [ENTRY]: pipe(
        [
          "export function measure(width: number): number {",
          "  return width;",
          "}",
          "measure.unit = (value: number): string => String(value) + 'px';",
          "measure.scale = 2;",
          "export const describe = (): string => 'size';",
          "describe.label = 'label';",
        ],
        Arr.join("\n"),
      ),
    },
    "sizes",
    "1.0.0",
  );

type SizesProgram = ReturnType<
  ReturnType<typeof createCompilerHostWrapperWith>["createAuxiliaryProgram"]
>;

const expandoMember = (program: SizesProgram, owner: string, name: string): BoundSymbol => {
  const member = Arr.findFirst(program.getSourceFiles(), (file) => file.fileName === ENTRY).pipe(
    Option.flatMap((file) => {
      bindSourceFile(file.sourceFile);
      return bindingOf(file.sourceFile);
    }),
    Option.flatMap((binding) => Option.fromNullishOr(binding.symbol)),
    Option.flatMap((file) => exportOf(file, owner)),
    Option.flatMap((function_) => exportOf(function_, name)),
  );
  return Option.getOrThrowWith(member, () => new Error(`${owner}.${name} was not bound`));
};

const findsExpandoMembersByName = Effect.sync(() => {
  const program = createCompilerHostWrapperWith(
    sizesPackage(),
    ModuleResolutionKind.Node16,
    "",
  ).createAuxiliaryProgram([ENTRY]);
  const checker = program.getTypeChecker();
  const members = [
    ["measure", "unit"],
    ["measure", "scale"],
    ["describe", "label"],
  ] as const;
  deepStrictEqual(
    pipe(
      members,
      Arr.map(([owner, name]) =>
        checker.typeHasCallOrConstructSignatures(
          checker.getTypeOfSymbol(expandoMember(program, owner, name)),
        ),
      ),
    ),
    [true, false, false],
  );
});

layer(Layer.empty)("expando members of TypeScript functions", (it) => {
  it.effect(
    "are found in the checker by the position of their name",
    () => findsExpandoMembersByName,
  );
});
