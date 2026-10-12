import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { Effect } from "effect";

import type { Missing } from "#/entities/entry/model/entry";

const foundOrNotFound = <Found extends Readonly<{ status: "found" }>>(
  result: Found | Missing,
): Effect.Effect<Found, NotFoundError> => {
  if (result.status === "missing") {
    return Effect.fail(notFound());
  }
  return Effect.succeed(result);
};

export { foundOrNotFound };
