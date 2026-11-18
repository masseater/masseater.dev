---
title: "effect2rs"
description: "effect2rsはEffect SchemaからserdeのRust型を生成するため、Web側がTypeScriptでネイティブ側がRustであるデスクトップアプリでは、境界を越えるすべての型の定義を1つに集約できる。出力例では、拒否されるケースと、手書きのコピーを却下するチェックが示されている。"
tags: ["Effect", "Rust", "TypeScript", "Tauri"]
published: true
---

[effect2rs](https://github.com/masseater/masseater.dev/tree/main/libs/effect2rs) は、Effect Schema から serde derive を用いて Rust の型を生成する。私のデスクトップアプリは Tauri で構築されており、Rust プロセスの前に TypeScript のウェブ側を配置し、両者間のすべてのメッセージは 2 回型付けされていた。1 回は Effect Schema として、そしてもう 1 回は手書きの Rust 構造体としてだ。effect2rs は Effect Schema を唯一の定義とし、そこから Rust 側を生成する。自分用に構築したため、npm には掲載していない。

## Effect SchemaからRustモジュールへ

effect2rs はモジュールのエクスポート値を受け取り、Rust モジュール1つのテキストを返す。スキーマは `identifier` アノテーションが付くと型となり、スキーマの横にエクスポートされる単純な文字列、数値、またはブール値は定数となる。

```ts
import { effect2rs } from "@masseater.dev/effect2rs";
import { Effect, Schema } from "effect";

const Track = Schema.Struct({
  trackId: Schema.String,
  bpm: Schema.Number,
  bars: Schema.Int.check(Schema.isUint32()),
  key: Schema.optional(Schema.NullOr(Schema.String)),
}).annotate({ identifier: "Track" });

const Stem = Schema.Literals(["vocals", "drums", "bass", "other"]).annotate({ identifier: "Stem" });

const rust = await Effect.runPromise(
  effect2rs({ definitions: { Track, Stem, MAX_STEMS: 4 }, header: "// generated" }),
);
```

2026年11月18日にこれを実行したところ、以下のモジュールが出力された。

```rust
// generated

use serde::{Deserialize, Serialize};

pub const MAX_STEMS: i64 = 4;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub track_id: String,
    pub bpm: f64,
    pub bars: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Stem {
    Vocals,
    Drums,
    Bass,
    Other,
}

impl Stem {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Vocals => "vocals",
            Self::Drums => "drums",
            Self::Bass => "bass",
            Self::Other => "other",
        }
    }

    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "vocals" => Some(Self::Vocals),
            "drums" => Some(Self::Drums),
            "bass" => Some(Self::Bass),
            "other" => Some(Self::Other),
            _ => None,
        }
    }
}
```

`bars` フィールドは `isUint32` チェックにより `u32` となり、`bpm` は整数チェックがないため `f64` となった。`Eq` は `Track` に float が含まれているため、`Track` ではなく `Stem` に対して導出される。出力はすでに rustfmt が生成する形式になっているため、フォーマットチェックで検出されることはない。

## 何が何になるか

effect2rsは、SchemaをまずJSON Schemaに変換するのではなく、Effect v4独自のスキーマ表現である`SchemaRepresentation`を読み込む。これにより、識別子や整数チェックは記述されたままRust側に引き継がれる。

| Effect Schema                                  | Rust                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `Schema.Struct`                                | snake_case フィールドを持つ構造体。serde によってワイヤキーにリネームされている |
| 文字列リテラルの和集合                         | `as_str` と `parse` を含む列挙型                                                |
| リテラルタグを共有する構造体のユニオン         | 内部的にタグ付けされた列挙型                                                    |
| `isInt` や `isUint32` などの整数チェック       | `i32`, `u32`, `i64` or `u64`                                                    |
| 整数判定のない数値                             | `f64`                                                                           |
| `Schema.DateTimeUtcFromString` のような変換    | そのエンコードされた側、ここでは `String`                                       |
| 再帰的な参照                                   | A `Box`                                                                         |
| エクスポートされた文字列、数値、またはブール値 | `pub const`                                                                     |

Rustのキーワードは生の識別子になる。生の識別子にならない名前には接尾辞が、数字で始まる名前には接頭辞が付く。

## 拒否するケース

effect2rsは、推測ではなく`UnsupportedSchema`とスキーマのパスを指定して失敗する。独自の`identifier`を持たず別の構造体の中にネストされた構造体は、Rustが名前を必要とするため、`Track.meta`で失敗する。文字列と数値のユニオンは失敗し、数値リテラルのユニオンも同様に失敗する。Effectは、同じ識別子を持つ2つ目のスキーマをひっそりと`Name_1`にリネームするため、effect2rsもそれをエラーとして報告する。

## チェックでは、古い出力や手書きのコピーは拒否される

`checkRust` は、生成された各ファイルを、現在のスキーマが生成する内容と比較する。ファイルが欠落しているか異なっている場合は `StaleRust` で失敗し、生成済みファイルが既に宣言している名前を同一ディレクトリ内の別の `.rs` ファイルも宣言している場合は `HandWrittenCopies` で失敗する。2つ目の失敗により、Rust 開発者または AI が生成済みの構造体の隣に構造体を手入力できなくなる。

## 両者の違い

パッケージ内のCargoクレートは、サンプルをserde経由でラウンドトリップし、Effectが却下するすべてのサンプルをRustも却下するかどうかを確認する。それ以外の相違点は既知であり、認められている。

| ケース                                           | Effect              | Rust                                 |
| ------------------------------------------------ | ------------------- | ------------------------------------ |
| `NullOr` のキーが欠落している                    | 却下                | `None` として受理済み                |
| `null` for `optional(NullOr(...))`               | `null` のままにした | キーなしとしてシリアライズし直される |
| 文字列としてエンコードされた日付およびその他の値 | 検証済み            | 未検証                               |
| 不明なキー                                       | 無視                | 無視                                 |

## tauri-specta との位置づけ

この方向性は、既存のほとんどのツールとは正反対だ。[specta](https://github.com/specta-rs/specta)やtauri-spectaはRustの型からTypeScriptを生成し、JSON Schemaルートは[typify](https://github.com/oxidecomputer/typify)などのツールを経由する。2026年11月15日にeffect2rsをビルドした際、Effect SchemaからRustを生成するツールは見当たらなかった。私のアプリでは、tauri-spectaは依然としてTauriコマンドを型付けしており、effect2rsはそれらのコマンドが受け取り、返す型を生成している。現在は4つのアプリで利用されており、それぞれ3〜25個の型が生成されている。
