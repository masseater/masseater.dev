import { bridgePort } from "@masseater.dev/sts2-protocol";
import {
  Array as Arr,
  Context,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Option,
  Scope,
  Stream,
  String as Str,
  SynchronizedRef,
  pipe,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { Sts2Failed } from "#/shared/lib/errors.ts";
import { encodePowerShell, quote, withTextOutput } from "#/shared/lib/powershell.ts";

export type Output = Readonly<{ exitCode: number; output: string }>;

type Tunnel = Readonly<{
  instances: number;
  scope: Scope.Closeable;
  running: Effect.Effect<boolean>;
}>;

type VmShape = Readonly<{
  guest: (script: string) => Effect.Effect<Output, Sts2Failed>;
  desktopScreenshot: Effect.Effect<Uint8Array, Sts2Failed>;
  openTunnel: (instances: number) => Effect.Effect<void, Sts2Failed>;
}>;

const SSH_HOST = "win";
const HOST_SCRIPT = new URL("../../../vm/host.ps1", import.meta.url);
const SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "ServerAliveInterval=15"] as const;
const SUCCESS = 0;
const TUNNEL_READY = "sts2-mcp tunnel ready";
const TUNNEL_TIMEOUT = "1 minute";
const HOST_PRELUDE =
  "[Console]::OutputEncoding = [Text.Encoding]::UTF8; $PSStyle.OutputRendering = 'PlainText'; $ProgressPreference = 'SilentlyContinue'";

/** @internal */
export class Vm extends Context.Service<Vm, VmShape>()("sts2-mcp/shared/api/vm") {}

const failed = (cause: unknown): Sts2Failed => Sts2Failed.make({ message: String(cause) });

const hostCommand = (script: string, parameters: string): string =>
  `pwsh -NoProfile -NonInteractive -OutputFormat Text -EncodedCommand ${encodePowerShell(`${HOST_PRELUDE}\n& {\n${script}\n} ${parameters}`)}`;

const guestParameters = (script: string): string => {
  const encoded = encodePowerShell(withTextOutput(script));
  return `-Mode guest -GuestScript ${quote(encoded)}`;
};

const ports = (instances: number): readonly number[] => Arr.makeBy(instances, bridgePort);

const forwards = (instances: number): readonly string[] =>
  pipe(
    ports(instances),
    Arr.flatMap((port) => ["-L", `127.0.0.1:${String(port)}:127.0.0.1:${String(port)}`]),
  );

const runHost = Effect.fn("vm.runHost")(
  function* runHost(script: string, parameters: string) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(
      ChildProcess.make("ssh", [...SSH_OPTIONS, SSH_HOST, hostCommand(script, parameters)]),
    );
    const [output, exitCode] = yield* Effect.all(
      [handle.all.pipe(Stream.decodeText, Stream.mkString), handle.exitCode],
      { concurrency: "unbounded" },
    );
    const result: Output = { exitCode, output };
    return result;
  },
  Effect.scoped,
  Effect.mapError(failed),
);

const decodePng = ({ exitCode, output }: Output): Effect.Effect<Uint8Array, Sts2Failed> => {
  if (exitCode !== SUCCESS) {
    return Effect.fail(Sts2Failed.make({ message: output }));
  }
  const bytes = globalThis.Buffer.from(Str.trim(output), "base64");
  return Effect.succeed(new Uint8Array(bytes));
};

const tunnelReady = <Failure>(
  lines: Stream.Stream<string, Failure>,
): Effect.Effect<void, Sts2Failed> =>
  lines.pipe(
    Stream.splitLines,
    Stream.map(Str.trim),
    Stream.takeUntil((line) => line === TUNNEL_READY),
    Stream.runCollect,
    Effect.mapError(failed),
    Effect.filterOrFail(Arr.contains(TUNNEL_READY), (collected) =>
      Sts2Failed.make({ message: Arr.join(collected, "\n") }),
    ),
    Effect.timeoutOrElse({
      duration: TUNNEL_TIMEOUT,
      orElse: () => Effect.fail(Sts2Failed.make({ message: "the tunnel did not open" })),
    }),
    Effect.asVoid,
  );

const spawnTunnel = Effect.fn("vm.spawnTunnel")(function* spawnTunnel(
  script: string,
  instances: number,
  newScope: () => Effect.Effect<Scope.Closeable>,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const scope = yield* newScope();
  const portList = pipe(ports(instances), Arr.map(String), Arr.join(","));
  const command = ChildProcess.make("ssh", [
    ...SSH_OPTIONS,
    "-o",
    "ExitOnForwardFailure=yes",
    ...forwards(instances),
    SSH_HOST,
    hostCommand(script, `-Mode tunnel -Ports ${portList}`),
  ]);
  const handle = yield* spawner.spawn(command).pipe(Scope.provide(scope), Effect.mapError(failed));
  yield* tunnelReady(Stream.decodeText(handle.all));
  const running = handle.isRunning.pipe(Effect.orElseSucceed(() => false));
  const tunnel: Tunnel = { instances, scope, running };
  return tunnel;
});

const make = Effect.gen(function* makeVm() {
  const fs = yield* FileSystem.FileSystem;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const layerScope = yield* Effect.scope;
  const script = yield* fs.readFileString(HOST_SCRIPT.pathname).pipe(Effect.mapError(failed));
  const tunnel = yield* SynchronizedRef.make(Option.none<Tunnel>());
  const withSpawner = Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner);
  const run = (parameters: string): Effect.Effect<Output, Sts2Failed> =>
    runHost(script, parameters).pipe(withSpawner);
  const spawn = (instances: number): Effect.Effect<Tunnel, Sts2Failed> =>
    spawnTunnel(script, instances, () => Scope.fork(layerScope)).pipe(withSpawner);
  const openTunnel = (instances: number): Effect.Effect<void, Sts2Failed> =>
    SynchronizedRef.updateEffect(tunnel, (current) =>
      Effect.gen(function* refresh() {
        if (Option.isSome(current)) {
          const open = current.value;
          const running = yield* open.running;
          if (running && open.instances >= instances) {
            return current;
          }
          yield* Scope.close(open.scope, Exit.void);
        }
        const spawned = yield* spawn(instances);
        return Option.some(spawned);
      }),
    );
  return Vm.of({
    guest: (guestScript) => run(guestParameters(guestScript)),
    desktopScreenshot: run("-Mode screenshot").pipe(Effect.flatMap(decodePng)),
    openTunnel,
  });
});

/** @internal */
export const vmLayer = Layer.effect(Vm, make);
