---
title: decision-experiments
description: decision モデルで文書の中身を安く速く判定できるかを試す実験の置き場
tags: [decision-model, openrouter, effect]
published: true
---

OpenRouter の decision モデルで、文書の中身を安く速く判定できるかを試している。decision モデルは文章を書かず、問いへの答えの確率だけを返すので、大きなモデルに直接判定させるより安く速い。

## injection-bisect

AI に渡す文書へプロンプトインジェクションが紛れていないかを調べ、紛れていればその箇所を示す。[デモ](https://masseater.dev/injection-bisect/)では OpenRouter の API キーを入力して、手元のファイルを試せる。npm には [@r_masseater/injection-bisect](https://www.npmjs.com/package/@r_masseater/injection-bisect) として出している。

## ocr-decide

請求書やレシートの画像を OCR で読み、どの行がどの項目かを decision モデルに選ばせる。[デモ](https://masseater.dev/ocr-decide/)では、画像対応のモデルにそのまま読ませる方法と並べて試せる。20 枚で比べた正解率と時間と費用も同じページで見られる。

ソースは [GitHub](https://github.com/masseater/decision-experiments) にある。
