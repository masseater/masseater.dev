---
title: masseater.dev
description: 作ったものと書いた文章を載せるこのサイトと、その周りで動いている仕組み
tags: [cloudflare, tanstack-start, alchemy]
published: true
---

このサイトは、全ページをプリレンダーした静的アセットを Cloudflare の Static Site Worker から配っている。
Worker が先に受けるのは記事の star を数える `/api/stars/*` だけで、数は D1 に入る。

main に入った変更は、GitHub Actions の verify が通ったあとに Alchemy でデプロイされる。
CI が使う Cloudflare のトークンや API キーは、GitHub の OIDC トークンと引き換えに `credentials.masseater.dev` のブローカーが発行する。
同じゾーンには、ほかのリポのアプリも載っている。

::figure[masseater.dev の構成図]{name=architecture}

ソースは [GitHub](https://github.com/masseater/masseater.dev) にある。
