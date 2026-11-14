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

import { Sts2Failed } from "./errors.ts";
import { encodePowerShell, quote } from "./powershell.ts";

type Output = Readonly<{ exitCode: number; output: string }>;

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
const HOST_SCRIPT = new URL("../vm/host.ps1", import.meta.url);
const SSH_OPTIONS = ["-o", "BatchMode=yes", "-o", "ServerAliveInterval=15"] as const;
const SUCCESS = 0;

class Vm extends Context.Service<Vm, VmShape>()("sts2-mcp/vm") {}

const failed = (cause: unknown): Sts2Failed => Sts2Failed.make({ message: String(cause) });

const hostCommand = (script: string, parameters: string): string =>
  `pwsh -NoProfile -NonInteractive -EncodedCommand ${encodePowerShell(`& {\n${script}\n} ${parameters}`)}`;

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

const spawnTunnel = Effect.fn("vm.spawnTunnel")(function* spawnTunnel(
  script: string,
  instances: number,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const scope = yield* Scope.make();
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
  const running = handle.isRunning.pipe(Effect.orElseSucceed(() => false));
  const tunnel: Tunnel = { instances, scope, running };
  return tunnel;
});

const make = Effect.gen(function* makeVm() {
  const fs = yield* FileSystem.FileSystem;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const script = yield* fs.readFileString(HOST_SCRIPT.pathname).pipe(Effect.mapError(failed));
  const tunnel = yield* SynchronizedRef.make(Option.none<Tunnel>());
  const withSpawner = Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner);
  const run = (parameters: string): Effect.Effect<Output, Sts2Failed> =>
    runHost(script, parameters).pipe(withSpawner);
  const spawn = (instances: number): Effect.Effect<Tunnel, Sts2Failed> =>
    spawnTunnel(script, instances).pipe(withSpawner);
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
    guest: (guestScript) => run(`-Mode guest -GuestScript ${quote(encodePowerShell(guestScript))}`),
    desktopScreenshot: run("-Mode screenshot").pipe(Effect.flatMap(decodePng)),
    openTunnel,
  });
});

const vmLayer = Layer.effect(Vm, make);

/** @internal */
export { Vm, vmLayer };
export type { Output, VmShape };
