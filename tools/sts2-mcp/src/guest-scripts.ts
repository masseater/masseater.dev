import { BRIDGE_BASE_PORT, JOIN_CLIENT_ID_BASE } from "@masseater.dev/sts2-protocol";
import { Array as Arr, pipe } from "effect";

import { list, quote } from "./powershell.ts";

type DevLoop = Readonly<{
  mods: readonly string[];
  instances: number;
  launch: boolean;
  build: boolean;
}>;

type Deploy = Readonly<{ ref: string; mods: readonly string[] }>;

type Launch = Readonly<{ instances: number; mods: readonly string[] }>;

type Logs = Readonly<{ instance: number; lines: number }>;

const REPOSITORY = String.raw`C:\dev\masseater.dev`;
const DEV_LOOP = String.raw`${REPOSITORY}\apps\sts2-mods\scripts\vm\dev-loop.ps1`;
const INSTANCES_FILE = String.raw`C:\dev\logs\instances.json`;
const SINGLE = 1;

const lines = (parts: readonly string[]): string => pipe(parts, Arr.join("\n"));

const flag = (enabled: boolean, name: string): readonly string[] => {
  if (enabled) {
    return [];
  }
  return [name];
};

const modsFlag = (mods: readonly string[]): readonly string[] => {
  if (Arr.isReadonlyArrayNonEmpty(mods)) {
    return [`-Mods ${list(mods)}`];
  }
  return [];
};

const devLoop = ({ mods, instances, launch, build }: DevLoop): string =>
  pipe(
    [
      `& ${quote(DEV_LOOP)}`,
      `-BridgeBasePort ${String(BRIDGE_BASE_PORT)}`,
      `-JoinClientIdBase ${String(JOIN_CLIENT_ID_BASE)}`,
      `-Instances ${String(instances)}`,
      ...modsFlag(mods),
      ...flag(launch, "-NoLaunch"),
      ...flag(build, "-SkipBuild"),
    ],
    Arr.join(" "),
  );

const deployScript = ({ ref, mods }: Deploy): string =>
  lines([
    "$ErrorActionPreference = 'Stop'",
    `git -C ${quote(REPOSITORY)} fetch --quiet origin ${quote(ref)}`,
    "if ($LASTEXITCODE -ne 0) { exit 1 }",
    `git -C ${quote(REPOSITORY)} checkout --quiet --force --detach FETCH_HEAD`,
    "if ($LASTEXITCODE -ne 0) { exit 1 }",
    devLoop({ mods, instances: SINGLE, launch: false, build: true }),
    "exit $LASTEXITCODE",
  ]);

const launchScript = ({ instances, mods }: Launch): string =>
  lines([devLoop({ mods, instances, launch: true, build: false }), "exit $LASTEXITCODE"]);

const stopScript = lines([
  "Get-Process SlayTheSpire2 -ErrorAction SilentlyContinue | Stop-Process -Force",
  "Start-Sleep 2",
  "'running=' + @(Get-Process SlayTheSpire2 -ErrorAction SilentlyContinue).Count",
]);

const logScript = ({ instance, lines: tail }: Logs): string =>
  lines([
    `$entry = Get-Content ${quote(INSTANCES_FILE)} -Raw | ConvertFrom-Json | Where-Object instance -eq ${String(instance)}`,
    `if (-not $entry) { Write-Output 'instance ${String(instance)} has not been launched'; exit 1 }`,
    `Get-Content $entry.log -Tail ${String(tail)} -Encoding UTF8`,
  ]);

export { deployScript, launchScript, logScript, stopScript };
