#!/usr/bin/env node
import { enableCompileCache } from "node:module";

enableCompileCache();

const { runCli } = await import("#/app/cli.ts");

runCli();
