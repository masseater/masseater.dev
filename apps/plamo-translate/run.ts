import { runner } from "@r_masseater/workers-tracing/effect";
import { Logger } from "effect";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

export const runLogged = runner(logger);
