import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { Option, Schema, pipe } from "effect";

import { DEFAULT_SIDEBAR_WIDTH, sidebarWidthOf } from "#/shared/model/index.ts";

const OPEN_COOKIE = "sidebar_state";

const WIDTH_COOKIE = "sidebar_width";

const CLOSED = "false";

const KEEP_SECONDS = 31_536_000;

const COOKIE = {
  httpOnly: true,
  maxAge: KEEP_SECONDS,
  path: "/",
  sameSite: "lax",
  secure: true,
} as const;

export type SidebarLayout = Readonly<{ open: boolean; width: number }>;

export const readSidebarLayout = createIsomorphicFn()
  .server((): SidebarLayout => ({
    open: getCookie(OPEN_COOKIE) !== CLOSED,
    width: pipe(
      Option.fromUndefinedOr(getCookie(WIDTH_COOKIE)),
      Option.map(Number),
      Option.match({ onNone: () => DEFAULT_SIDEBAR_WIDTH, onSome: sidebarWidthOf }),
    ),
  }))
  .client((): SidebarLayout => ({ open: true, width: DEFAULT_SIDEBAR_WIDTH }));

export const saveSidebarOpen = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(Schema.Boolean))
  .handler(({ data }) => {
    setCookie(OPEN_COOKIE, String(data), COOKIE);
  });

export const saveSidebarWidth = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(Schema.Finite))
  .handler(({ data }) => {
    setCookie(WIDTH_COOKIE, String(sidebarWidthOf(data)), COOKIE);
  });
