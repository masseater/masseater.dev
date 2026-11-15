import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { Schema } from "effect";

const SIDEBAR_COOKIE = "sidebar_state";

const CLOSED = "false";

const KEEP_SECONDS = 31_536_000;

export const readSidebarOpen = createIsomorphicFn()
  .server(() => getCookie(SIDEBAR_COOKIE) !== CLOSED)
  .client(() => true);

export const saveSidebarOpen = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(Schema.Boolean))
  .handler(({ data }) => {
    setCookie(SIDEBAR_COOKIE, String(data), {
      httpOnly: true,
      maxAge: KEEP_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });
