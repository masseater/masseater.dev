/** @internal */
export const TEMPLATE = `---
title: ツール名
formats: [vertical]
length: { vertical: 30s }
voice: 8
readings: {}
---

# **ツール名** {#opening}

- 20XX年〜
- 出した会社・人

ツール名って知ってる？

## 特徴 {#features}

- 調べればわかる特徴
- 調べればわかる特徴
- 調べればわかる特徴

とにかく**ひとこと**。

## 使ってわかったこと {#insight}

- 使っている人ならではの観点
- 使っている人ならではの観点
- 使っている人ならではの観点

**ひとこと**。

## 不満点 {#complaints}

- 不満点
- 不満点

**ひとこと**。

## おすすめ度 {#rating}

★★★★☆

星**4つ**！

# 一言まとめ {#ending}

一言まとめ。
`;

/** @internal */
export const ejectedSource = (
  id: string,
): string => `import type { SceneProps } from "@masseater.dev/video-kit";
import { StandardScene } from "@masseater.dev/video-kit";
import type { ReactNode } from "react";

const NO_CREDITS: readonly string[] = [];

export const Scene = ({ timed, format, number }: SceneProps): ReactNode => (
  <StandardScene credits={NO_CREDITS} format={format} number={number} timed={timed} />
);

export const SCENE_ID = "${id}";
`;
