#nullable enable

using System.Linq;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    public sealed partial class AredokoWindow
    {
        void DrawDetail()
        {
            using var _ = new EditorGUILayout.VerticalScope(EditorStyles.helpBox, GUILayout.Width(DetailWidth), GUILayout.ExpandHeight(true));
            using var scroll = new EditorGUILayout.ScrollViewScope(detailScroll);
            detailScroll = scroll.scrollPosition;
            var chosen = results.Where(result => selected.Contains(result.AssetId)).ToArray();
            if (chosen.Length == 0)
            {
                return;
            }

            var first = chosen[0];
            var preview = previews!.Get(first);
            var size = DetailWidth - 24;
            GUILayout.Label(preview, GUILayout.Width(size), GUILayout.Height(size));
            EditorGUILayout.LabelField(Labels.FileName(first.Pathname), EditorStyles.boldLabel);
            EditorGUILayout.LabelField(first.Pathname, EditorStyles.wordWrappedMiniLabel);
            Field("種類", Labels.Kind(first.Kind));
            if (chosen.Length > 1)
            {
                EditorGUILayout.LabelField($"ほか {chosen.Length - 1} 件を選択中", EditorStyles.miniLabel);
            }

            GUILayout.Space(8);
            DrawPackage(first);
            GUILayout.Space(8);
            DrawActions(chosen);
        }

        static void Field(string label, string value)
        {
            EditorGUILayout.LabelField(label, EditorStyles.miniBoldLabel);
            EditorGUILayout.LabelField(value, EditorStyles.wordWrappedLabel);
        }

        void DrawPackage(SearchResult result)
        {
            EditorGUILayout.LabelField("パッケージ", EditorStyles.boldLabel);
            EditorGUILayout.LabelField(result.PackageName, EditorStyles.wordWrappedLabel);
            if (!packages.TryGetValue(result.PackageId, out var package))
            {
                return;
            }

            var summary = package.Summary;
            if (summary.Avatars.Length > 0)
            {
                Field("対応アバター", string.Join("、", summary.Avatars));
            }

            if (summary.Shaders.Length > 0)
            {
                Field("シェーダー", string.Join("、", summary.Shaders));
            }

            if (summary.Colors.Length > 0)
            {
                Field("色", string.Join("、", summary.Colors));
            }

            var counts = summary.Counts.Where(count => count.Kind != AssetKind.Other).Select(count => $"{Labels.Kind(count.Kind)} {count.Count}");
            EditorGUILayout.LabelField(string.Join("・", counts), EditorStyles.wordWrappedMiniLabel);
            if (package.Booth != null)
            {
                EditorGUILayout.LabelField($"BOOTH: {package.Booth.Name}", EditorStyles.wordWrappedMiniLabel);
                EditorGUILayout.LabelField($"{package.Booth.Shop}・{package.Booth.Price}", EditorStyles.miniLabel);
                if (GUILayout.Button("BOOTH の商品ページを開く"))
                {
                    Application.OpenURL(package.Booth.Url);
                }
            }
        }

        void DrawActions(SearchResult[] chosen)
        {
            var external = chosen.Where(result => result.PackageKind == PackageKind.Unitypackage).ToArray();
            using (new EditorGUI.DisabledScope(busy))
            {
                if (external.Length > 0 && GUILayout.Button(external.Length > 1 ? $"選んだ {external.Length} 件をインポート" : "インポート", GUILayout.Height(28)))
                {
                    Import();
                }
            }

            if (chosen.Length == 1 && chosen[0].PackageKind == PackageKind.Project && GUILayout.Button("プロジェクトで表示"))
            {
                Reveal(chosen[0]);
            }
        }

        static void Reveal(SearchResult result)
        {
            var path = AssetDatabase.GUIDToAssetPath(result.Guid);
            var asset = string.IsNullOrEmpty(path) ? null : AssetDatabase.LoadMainAssetAtPath(path);
            if (asset == null)
            {
                return;
            }

            Selection.activeObject = asset;
            EditorGUIUtility.PingObject(asset);
        }
    }
}
