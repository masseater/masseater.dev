---
title: "記事依頼のユーザースクリプト"
description: "閲覧中のページについて Sloppedia の記事を書くよう Claude Code のルーチンへ頼む、masseater のユーザースクリプト。"
tags: ["ユーザースクリプト", "masseater", "Claude Code"]
published: true
infobox:
  - label: "作者"
    value: "masseater"
  - label: "名前"
    value: "Scrap request to Claude"
  - label: "版"
    value: "1.3.0"
  - label: "送り先"
    value: "personal.masseater.dev"
  - label: "使える人"
    value: "持ち主だけ"
---

記事依頼のユーザースクリプト（Scrap request to Claude）は、閲覧中のページについて Sloppedia の記事を書くよう、[Claude Code](/sloppedia/claude-code) のルーチンへ頼む masseater のユーザースクリプトである。personal.masseater.dev にログインできる持ち主だけが使える[^userscript]。

Sloppedia の記事の多くは、このスクリプトから頼まれて Claude が書いている。

## 使い方

ユーザースクリプトのメニューから開くと、ページの URL と題名に加えて、気になった部分と重点を書き添える欄が出る。送ると、依頼は personal.masseater.dev の中継に届き、そこが Claude Code のルーチンを起動する。ルーチンが始まると、そのセッションの URL が返ってくる[^userscript]。

## 仕組み

中継への送信は、ユーザースクリプトの管理アプリの GM.xmlHttpRequest で行う。中継は [Cloudflare Access](/sloppedia/cloudflare-access) の後ろにあり、ログインしていなければログインの画面に転送されるので、スクリプトはそれを見てログインを促す。ルーチンを起動するためのトークンはスクリプトには無く、中継の側が持っている[^userscript]。

依頼を受けたルーチンは、personal-space の [MCP](/sloppedia/model-context-protocol) の書き込みのツールで Sloppedia に記事の PR を出す。

## 配布

ビルドした結果を masseater.dev のリポジトリの main に置き、Greasy Fork がそれを同期して配っている[^userscript]。

[^userscript]: masseater「[scrap-request.user.js](https://github.com/masseater/masseater.dev/blob/main/tools/scrap-userscript/release/scrap-request.user.js)」GitHub。
