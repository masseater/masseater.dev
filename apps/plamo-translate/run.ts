import { runner } from "@r_masseater/workers-tracing/effect";
import { Logger } from "effect";

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const runLogged = runner(logger);

export { runLogged };
