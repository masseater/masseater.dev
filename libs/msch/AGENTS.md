# @r_masseater/msch

masseater の検査の方針をまとめたパッケージ。値の集合と形の持ち主を調べる `msch` と、oxlint のプリセットを持つ。

- 公開: npm（`@r_masseater/msch`）
- プリセットの JS プラグインは `import.meta.resolve` で msch の依存から解決し、使う側に個別のインストールを求めない。
- masseater.dev だけに要るルールと overrides は、ルートの `lint.config.ts` に置く。
