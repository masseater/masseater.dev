---
title: "sshole"
description: "musl を使う Linux の OpenSSH で、パスワードを持たないはずのアカウントに、257バイト以上の任意のパスワードで入れた脆弱性。"
tags: ["脆弱性", "OpenSSH", "musl", "2026年の出来事"]
published: true
infobox:
  - label: "対象"
    value: "musl で PAM を使わない sshd"
  - label: "主な影響先"
    value: "Alpine Linux、OpenWrt、Buildroot、Yocto"
  - label: "生まれた時期"
    value: "2016年（OpenSSH 7.3p1）"
  - label: "発見"
    value: "Özgün Kültekin（Wakefield）、2026年11月"
  - label: "修正"
    value: "OpenSSH 10.6p2（2026年11月5日）"
  - label: "公式サイト"
    value: "sshhole.com"
    href: "https://sshhole.com/"
---

sshole は、musl を C の標準ライブラリに使う Linux の [OpenSSH](/sloppedia/openssh) にあった、パスワード認証を素通りできる脆弱性である。パスワードの欄が `*` だけのアカウントは、本来どんなパスワードでもログインできない。ところが PAM を使わない sshd では、257バイト以上のパスワードを送るとそのアカウントに入れた。名前は `*` と ssh を掛けたもので、公式サイトは `*sshole` と書く[^sshhole]。2016年から10年ほど気づかれず、2026年11月5日の OpenSSH 10.6p2 で直った[^release]。

## 仕組み

Unix のパスワードのハッシュは、`$6$abc$…` のような形で `/etc/shadow` に入っている。`$6$` は SHA-512、`abc` はソルトを表す。sshd は、打ち込まれたパスワードを同じソルトで `crypt()` にかけ、結果が保存した欄と同じならログインを認める。欄が `*` だけなら、ハッシュの結果が `*` になることはないので、どんなパスワードでも入れない。1980年の 3BSD で Bill Joy が daemon のアカウントに `*` を置いて以来の慣習である[^sshhole]。

この前提が、3つの変更の重なりで崩れた[^sshhole][^timeline]。

| 年   | 変更                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2012 | musl の `crypt()` が、失敗したときに NULL ではなく `*` を返すようになった。NULL を確かめない呼び出し元が落ちないようにするためである                                      |
| 2012 | musl が SHA-512 の crypt を足し、256バイトを超えるパスワードを拒むようにした。長いパスワードで計算を重くさせる攻撃を防ぐためである                                        |
| 2016 | OpenSSH が CVE-2016-6210 を直した。使えるソルトの無いアカウントでも、ほかのアカウントのソルトを借りてハッシュを計算し、応答の時間でアカウントの有無が分からないようにした |

3つが重なると次のように動く。`*` のアカウントにはソルトが無いので、sshd はパスワードを持つ別のアカウントのソルトを借りる。257バイト以上のパスワードを渡すと、musl の `crypt()` は失敗して `*` を返す。sshd はそれを保存した欄の `*` と比べ、同じなのでログインを認める[^readme]。

sshd はパスワードを1,024バイトまでしか受け取らないので、通るのは257から1,024バイトのパスワードである[^sshhole]。

## 影響を受ける条件

README は、次の5つがすべて当てはまるときに影響を受けるとしている[^readme]。

| 条件             | 中身                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| libc             | musl を使う。Alpine、OpenWrt、Buildroot、Yocto、postmarketOS、Void の musl 版、Chimera などである |
| PAM              | sshd を PAM なしで作っている。Alpine の標準の `openssh-server` はこれにあたる                     |
| パスワード認証   | `PasswordAuthentication yes` である。これが既定である                                             |
| `*` のアカウント | パスワードの欄がちょうど `*` のアカウントがある                                                   |
| 本物のハッシュ   | `$5$` か `$6$` のハッシュを持つアカウントが1つ以上ある                                            |

`*` のアカウントには、鍵だけでログインする利用者、LDAP の利用者、Alpine の root が当たる。Alpine は2019年に、Docker イメージの root にパスワードが無い問題（CVE-2019-5021）を受けて root を `!` で閉じた。しかし PAM なしでは `!` が鍵での認証まで止めてしまうので、2022年の 3.16 で `*` に変えた。これで Alpine の root も対象に入った[^sshhole][^timeline]。

公式サイトによれば、Alpine の AWS と Azure の公式イメージでは、既定の alpine のアカウントがこの条件に当てはまる。このアカウントはパスワードなしで doas を使えるので、root を取られるのと同じである[^sshhole]。

glibc を使う Debian、Ubuntu、Fedora などや、PAM を通す構成、Dropbear、OpenBSD、FreeBSD、macOS は影響を受けない[^readme]。

## 気づかれなかった理由

公式サイトは、10年気づかれなかった理由をいくつか挙げている。パスワードを設定していない新しい機械は対象にならない。`*` の欄に対しては、1回目の失敗の後でないと通らない。OpenSSH は OpenBSD と glibc で試験していて、musl は sshd を試験していない。多くのディストリビューションは PAM を通すので、`*` に対して `crypt()` を呼ばない[^sshhole]。

近くまで来た例はあった。2013年の Debian のバグ #714219 では、glibc にも musl と同じく `*` を返させる案が出た。Debian はその後 libxcrypt へ移り、こちらは `*0` を返したので、1文字の違いで避けられた。2024年12月には musl のメーリングリストで、BusyBox の passwd が257文字のパスワードで落ちる件が話されたが、sshd の話は出なかった。2026年10月30日には OpenSSH の安全性の見直しで、問題の箇所から4行離れた `pick_salt()` の処理が直されていた[^sshhole][^timeline]。

## 発見と修正

見つけたのは Wakefield の Özgün Kültekin である。glibc と musl、PAM のあり・なし、shadow のあり・なしの組み合わせで sshd を作り、およそ17,600通りの変わったログインを試した。musl で PAM なしの組み合わせだけが、通すべきでないログインを通した。本人は、作業にはエージェントの群れを大量に使ったと書いている[^sshhole]。

2026年11月3日に見つけ、その日のうちに OpenSSH へ報告した。修正のパッチは1時間かからずに返ってきた。11月4日に Alpine と musl に知らせ、11月5日に OpenSSH 10.6p2 と Alpine の修正版のパッケージが同時に出た[^timeline]。

修正では、保存した欄が本物のハッシュとして短すぎるときに sshd が比較を飛ばす。libc の静的な領域を指すポインタを使うのもやめた。パッチは 7.3p1 以降の版に当てられる[^readme]。

OpenSSH のリリースノートは、この脆弱性を PAM なしで作って動かす一部の Linux に影響するパスワード認証の回避として載せた。根本の原因は sshd の外にあると考えるが、sshd を通して突けるので sshd の側で避けた、とも書いている[^release]。

同じリリースノートは、AI のモデルや AI の助けで見つかった脆弱性の報告が大量に届いていると書いた。AI の道具で見つかった脆弱性が、別の研究者にも独自に見つかる例があったという。報告しない攻撃者も同じ脆弱性を見つけられるとみて、修正を早く届けるために当面はリリースを増やすとした[^release]。

## 対処

公式サイトは、OpenSSH を 10.6p2 に上げるよう勧めている。すぐ上げられないときは `PasswordAuthentication no` でパスワードのログインを止めれば塞がる。GitHub のリポジトリには、自分の機械が当てはまるかを調べるスクリプト、Docker で再現する環境、上流のパッチが置かれている[^sshhole][^readme]。

[^sshhole]: Özgün Kültekin「[\*sshole](https://sshhole.com/)」。2026年11月6日に閲覧。

[^readme]: oz9un「[sshole](https://github.com/oz9un/sshole)」GitHub。2026年11月6日に閲覧。

[^timeline]: oz9un「[timeline](https://github.com/oz9un/sshole/blob/main/TIMELINE.md)」GitHub。2026年11月6日に閲覧。

[^release]: OpenSSH「[OpenSSH 10.6p2 release notes](https://www.openssh.com/txt/release-10.6p2)」2026年11月5日。
