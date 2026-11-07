#nullable enable

using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    public sealed partial class AredokoWindow
    {
        void DrawResults()
        {
            using var scroll = new EditorGUILayout.ScrollViewScope(gridScroll, GUILayout.ExpandWidth(true));
            gridScroll = scroll.scrollPosition;
            if (results.Length == 0)
            {
                if (!unreachable && (searching || !string.IsNullOrWhiteSpace(searchedQuery)))
                {
                    EditorGUILayout.LabelField(searching ? "検索しています…" : "見つかりませんでした", EditorStyles.centeredGreyMiniLabel, GUILayout.Height(60));
                }

                return;
            }

            var width = position.width - DetailWidth - 24;
            var columns = Mathf.Max(1, Mathf.FloorToInt(width / (tileSize + 8)));
            for (var start = 0; start < results.Length; start += columns)
            {
                using (new EditorGUILayout.HorizontalScope())
                {
                    for (var index = start; index < Mathf.Min(start + columns, results.Length); index++)
                    {
                        DrawTile(results[index]);
                    }

                    GUILayout.FlexibleSpace();
                }
            }
        }

        void DrawTile(SearchResult result)
        {
            var rect = GUILayoutUtility.GetRect(tileSize + 4, tileSize + 34, GUILayout.Width(tileSize + 4));
            var isSelected = selected.Contains(result.AssetId);
            if (isSelected)
            {
                EditorGUI.DrawRect(rect, new Color(0.24f, 0.49f, 0.9f, 0.45f));
            }

            var image = new Rect(rect.x + 2, rect.y + 2, tileSize, tileSize);
            GUI.DrawTexture(image, previews!.Get(result), ScaleMode.ScaleToFit);
            if (result.PackageKind == PackageKind.Project)
            {
                GUI.Label(new Rect(image.x + 2, image.y + 2, 60, 16), "プロジェクト", EditorStyles.miniButton);
            }

            GUI.Label(new Rect(rect.x, image.yMax + 2, rect.width, 30), new GUIContent(Labels.FileName(result.Pathname), $"{result.Pathname}\n{result.PackageName}"), tileLabel);
            HandleTileEvent(rect, result);
        }

        void HandleTileEvent(Rect rect, SearchResult result)
        {
            var current = Event.current;
            if (current.type != EventType.MouseDown || !rect.Contains(current.mousePosition))
            {
                return;
            }

            if (current.clickCount == 2)
            {
                if (result.PackageKind == PackageKind.Project)
                {
                    Reveal(result);
                }
                else
                {
                    selected.Clear();
                    selected.Add(result.AssetId);
                    Import();
                }
            }
            else if (EditorGUI.actionKey || current.shift)
            {
                if (!selected.Remove(result.AssetId))
                {
                    selected.Add(result.AssetId);
                }
            }
            else
            {
                selected.Clear();
                selected.Add(result.AssetId);
            }

            LoadPackage(result.PackageId);
            current.Use();
            Repaint();
        }
    }
}
