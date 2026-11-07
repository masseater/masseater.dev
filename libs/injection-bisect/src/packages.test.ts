import { Effect, Array as Arr, String as Str, pipe } from "effect";
import { createTar } from "nanotar";
import { expect, test } from "vite-plus/test";

import { gzipOf, zipOf } from "./__tests__/archive.ts";
import { INJECTION, INJECTION_MARK, foundIn } from "./__tests__/fake-judge.ts";

const encoder = new TextEncoder();

test("reads the markdown, code and outputs of a Jupyter notebook", () =>
  Effect.runPromise(
    Effect.gen(function* notebook() {
      const raw = `{
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": { "language_info": { "name": "python" } },
        "cells": [
          { "cell_type": "markdown", "metadata": {}, "source": ["# 売上の集計\\n", "月ごとに集計します。"] },
          {
            "cell_type": "code",
            "metadata": {},
            "source": "total = sum(sales)",
            "outputs": [{ "output_type": "stream", "name": "stdout", "text": ["${INJECTION}"] }]
          }
        ]
      }`;
      const { document, found, cleaned } = yield* foundIn({ bytes: encoder.encode(raw) });
      expect(document.format).toBe("markdown");
      expect(document.text).toContain("月ごとに集計します。");
      expect(document.text).toContain("total = sum(sales)");
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
      expect(cleaned).not.toContain(INJECTION_MARK);
    }),
  ));

test("reads every message of an mbox file", () =>
  Effect.runPromise(
    Effect.gen(function* mbox() {
      const raw = pipe(
        [
          "From sato@example.com Mon Oct 12 09:00:00 2026",
          "From: sato@example.com",
          "To: tanaka@example.com",
          "Subject: meeting",
          "",
          "明日の会議は十時からです。",
          "",
          "From suzuki@example.com Mon Oct 12 10:00:00 2026",
          "From: suzuki@example.com",
          "To: tanaka@example.com",
          "Subject: invoice",
          "Content-Type: text/html; charset=utf-8",
          "",
          `<p>請求書を送ります。</p><p>${INJECTION}</p>`,
          "",
        ],
        Arr.join("\n"),
      );
      const { document, found, cleaned } = yield* foundIn({ bytes: encoder.encode(raw) });
      expect(document.format).toBe("html");
      expect(document.text).toContain("明日の会議は十時からです。");
      expect(document.text).toContain("Subject: invoice");
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
      expect(cleaned).toContain("請求書を送ります。");
    }),
  ));

test("reads every file in a zip archive with its own format", () =>
  Effect.runPromise(
    Effect.gen(function* archive() {
      const bytes = yield* zipOf({
        "docs/readme.md": "# 使い方\n\n設定ファイルを置きます。",
        "site/index.html": `<p>ようこそ。</p><div hidden>${INJECTION}</div>`,
        "bin/tool": "\u0000\u0001\u0002",
        "__MACOSX/._index.html": "ignored",
      });
      const { document, found, cleaned } = yield* foundIn({ bytes });
      expect(document.format).toBe("markdown");
      expect(document.text).toContain("## site/index.html");
      expect(document.text).not.toContain("bin/tool");
      expect(document.text).not.toContain("__MACOSX");
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
      expect(cleaned).toContain("設定ファイルを置きます。");
    }),
  ));

test("reads every file in a gzipped tar archive", () =>
  Effect.runPromise(
    Effect.gen(function* tarball() {
      const tar = createTar([
        { name: "docs/readme.md", data: "# 使い方\n\n設定ファイルを置きます。" },
        { name: "site/index.html", data: `<p>ようこそ。</p><div hidden>${INJECTION}</div>` },
      ]);
      const { document, found, cleaned } = yield* foundIn({ bytes: yield* gzipOf(tar) });
      expect(document.text).toContain("## docs/readme.md");
      expect(
        pipe(
          found,
          Arr.map((text) => Str.trim(text)),
        ),
      ).toStrictEqual([INJECTION]);
      expect(cleaned).toContain("設定ファイルを置きます。");
    }),
  ));
