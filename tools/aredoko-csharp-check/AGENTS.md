# aredoko-csharp-check

aredoko の Unity 向け C#（Editor/Client、Editor/Protocol、Editor/Indexing、Editor/Window）を dotnet build でコンパイルチェックするタスク。
UnityEditor と UnityEngine の代わりに `UnityStubs` に対してコンパイルする。スタブはエディタ拡張が使うメンバーの形だけを持ち、シグネチャは Unity 2022.3 のスクリプトリファレンスから写す。リファレンスに載らない PreviewRenderUtility は、UnityCsReference の 2022.3 のソースから写す。エディタ拡張で新しい Unity のメンバーを使うときは、同じ出典からスタブにも足す。
