import type { FileSystem, Path } from "effect";
import type { HttpClient } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";

type HttpServices = HttpClient.HttpClient | FileSystem.FileSystem | Path.Path;

type Services = HttpServices | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
export type { HttpServices, Services };
