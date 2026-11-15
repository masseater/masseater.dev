import type { FileSystem, Path } from "effect";
import type { HttpClient } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";

export type HttpServices = HttpClient.HttpClient | FileSystem.FileSystem | Path.Path;

export type Services = HttpServices | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
