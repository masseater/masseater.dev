# @r_masseater/oxlint-plugin-decision

このワークスペースは oxlint プラグインである。平易な英語で書かれたルールに照らしてコードをチェックし、コードがルールに従っているかを decision モデルで判定する。

## decision モデルのみ

本プラグインが呼び出すのは decision モデルのみです。Typesafe System One API 経由の Jev ファミリー、および Cloudflare Workers AI 上の Clef ファミリーが対象となります。チャットモデル、チャット補完（chat completions）や OpenAI 互換のエンドポイント、あるいは logprobs を使ったチャットモデルへの「はい/いいえ」形式の質問は、決して追加しないでください。チャットモデルは質問 1 件あたりのコストがはるかに高く、型付きの質問に回答するように設計されていません。

プラグインを移行する先で decision モデルが利用できない場合は、オーナーに確認してください。別の種類のモデルで代用しないでください。
