import { fumx } from "@masseater.dev/song-format/vite";
import type { PluginOption } from "vite-plus";

import mdx from "#/app/vite/markdown/mdx.config.ts";

export const songs = (): PluginOption => fumx();

export const formats = (): PluginOption[] => [mdx, songs()];
