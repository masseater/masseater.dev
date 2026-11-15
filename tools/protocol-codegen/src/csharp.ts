import {
  AredokoRpcs,
  ENDPOINT_FILE,
  HOST,
  RpcCauseReason,
  RpcRequest,
  RpcResponse,
  ServerEndpoint,
  TOKEN_PARAMETER,
} from "@masseater.dev/aredoko-protocol";
import { Array, Effect, HashMap, HashSet, Option, Record, SchemaAST, pipe } from "effect";

import { csharpTypes } from "./json-schema-csharp.ts";

const NAMESPACE = "Aredoko.Protocol";
const GROUPS = { AredokoRpcs };

const EMPTY = "Empty";

const rpcs = pipe(
  Record.values(GROUPS),
  Array.flatMap(({ requests }) => Array.fromIterable(requests)),
);

const voidRoots = HashSet.fromIterable(
  pipe(
    rpcs,
    Array.flatMap(([tag, rpc]) => [
      [`${tag}Payload`, rpc.payloadSchema.ast] as const,
      [`${tag}Success`, rpc.successSchema.ast] as const,
    ]),
    Array.filter(([, ast]) => SchemaAST.isVoid(ast)),
    Array.map(([name]) => name),
  ),
);

const roots = pipe(
  rpcs,
  Array.flatMap(([tag, rpc]) => [
    { name: `${tag}Payload`, object: true, ast: rpc.payloadSchema.ast },
    { name: `${tag}Success`, object: true, ast: rpc.successSchema.ast },
    { name: `${tag}Error`, object: false, ast: rpc.errorSchema.ast },
  ]),
  Array.appendAll([
    { name: "EndpointFileContent", object: true, ast: ServerEndpoint.ast },
    { name: "WireRequest", object: true, ast: RpcRequest.ast },
    { name: "WireResponse", object: true, ast: RpcResponse.ast },
    { name: "WireCauseReason", object: true, ast: RpcCauseReason.ast },
  ]),
  Array.filter(({ ast }) => !SchemaAST.isVoid(ast)),
);

const typeOf =
  (names: HashMap.HashMap<string, string>) =>
  (name: string): string =>
    pipe(
      Option.liftPredicate(name, (candidate) => HashSet.has(voidRoots, candidate)),
      Option.as(EMPTY),
      Option.orElse(() => HashMap.get(names, name)),
      Option.getOrElse(() => name),
    );

const descriptor =
  (names: HashMap.HashMap<string, string>) =>
  (tag: string): string => {
    const resolve = typeOf(names);
    const type = `Rpc<${resolve(`${tag}Payload`)}, ${resolve(`${tag}Success`)}, ${resolve(`${tag}Error`)}>`;
    return `        public static readonly ${type} ${tag} = new ${type}("${tag}");`;
  };

const group =
  (names: HashMap.HashMap<string, string>) =>
  ([name, tags]: readonly [string, readonly string[]]): readonly string[] => [
    "",
    `    public static class ${name}`,
    "    {",
    ...pipe(tags, Array.map(descriptor(names))),
    "    }",
  ];

const descriptors = (
  names: HashMap.HashMap<string, string>,
  identifier: string,
): readonly string[] => {
  const groups = pipe(
    Record.toEntries(GROUPS),
    Array.map(([name, { requests }]) => [name, Array.fromIterable(requests.keys())] as const),
    Array.flatMap(group(names)),
  );
  return [
    `namespace ${NAMESPACE}`,
    "{",
    "    public sealed class Rpc<TPayload, TSuccess, TError>",
    "    {",
    "        internal Rpc(string method)",
    "        {",
    "            Method = method;",
    "        }",
    "",
    "        public string Method { get; }",
    "    }",
    "",
    `    public sealed class ${EMPTY}`,
    "    {",
    "    }",
    "",
    "    public static class EndpointFile",
    "    {",
    `        public const string Directory = "${identifier}";`,
    `        public const string Name = "${ENDPOINT_FILE}";`,
    `        public const string Host = "${HOST}";`,
    `        public const string TokenParameter = "${TOKEN_PARAMETER}";`,
    "    }",
    ...groups,
    "}",
  ];
};

export const csharp = Effect.fn("csharp")(function* csharp(identifier: string) {
  const { lines, names } = yield* csharpTypes({
    namespace: NAMESPACE,
    framework: "NewtonSoft",
    roots: () => roots,
  });
  return Array.join([...lines, "", ...descriptors(names, identifier), ""], "\n");
});
