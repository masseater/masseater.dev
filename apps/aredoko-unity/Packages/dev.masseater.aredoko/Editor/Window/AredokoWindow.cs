#nullable enable

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    public sealed partial class AredokoWindow : EditorWindow
    {
        const int ResultLimit = 120;
        const double SearchDelay = 0.4;
        const double StatusInterval = 2.0;
        const float DetailWidth = 280f;
        const float MinTile = 64f;
        const float MaxTile = 192f;

        static readonly string DesktopApp = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "aredoko", "aredoko-desktop.exe");

        readonly HashSet<long> selected = new HashSet<long>();
        readonly Dictionary<long, Package> packages = new Dictionary<long, Package>();
        PreviewCache? previews;
        string query = "";
        string searchedQuery = "";
        readonly KindFilter kinds = new KindFilter();
        float tileSize = 112f;
        SearchResult[] results = Array.Empty<SearchResult>();
        Status? status;
        string? notice;
        bool unreachable;
        bool searching;
        bool busy;
        double searchAt = -1;
        double statusAt;
        Vector2 gridScroll;
        Vector2 detailScroll;
        GUIStyle? tileLabel;

        [MenuItem("Window/aredoko/アセット検索 %#k")]
        public static void Open()
        {
            var window = GetWindow<AredokoWindow>();
            window.titleContent = new GUIContent("aredoko", EditorGUIUtility.IconContent("Search Icon").image);
            window.minSize = new Vector2(640, 360);
            window.Show();
        }

        void OnEnable()
        {
            previews = new PreviewCache(Repaint);
            EditorApplication.update += Tick;
            statusAt = 0;
        }

        void OnDisable()
        {
            EditorApplication.update -= Tick;
            previews?.Dispose();
            previews = null;
        }

        void Tick()
        {
            var now = EditorApplication.timeSinceStartup;
            if (searchAt > 0 && now >= searchAt)
            {
                searchAt = -1;
                RunSearch();
            }

            if (now >= statusAt)
            {
                statusAt = now + StatusInterval;
                RefreshStatus();
            }
        }

        void OnGUI()
        {
            tileLabel ??= new GUIStyle(EditorStyles.miniLabel) { alignment = TextAnchor.UpperCenter, wordWrap = true, clipping = TextClipping.Clip };
            DrawToolbar();
            DrawStatus();
            using (new EditorGUILayout.HorizontalScope())
            {
                DrawResults();
                DrawDetail();
            }
        }

        void DrawToolbar()
        {
            using var _ = new EditorGUILayout.HorizontalScope(EditorStyles.toolbar);
            GUI.SetNextControlName("aredoko-query");
            var next = EditorGUILayout.TextField(query, EditorStyles.toolbarSearchField, GUILayout.MinWidth(200));
            if (next != query)
            {
                query = next;
                searchAt = EditorApplication.timeSinceStartup + SearchDelay;
            }

            if (Event.current.type == EventType.KeyDown && Event.current.keyCode == KeyCode.Return && GUI.GetNameOfFocusedControl() == "aredoko-query")
            {
                searchAt = -1;
                RunSearch();
                Event.current.Use();
            }

            if (GUILayout.Button(kinds.Label, EditorStyles.toolbarDropDown, GUILayout.Width(120)))
            {
                kinds.ShowMenu(RunSearch);
            }

            tileSize = GUILayout.HorizontalSlider(tileSize, MinTile, MaxTile, GUILayout.Width(80));
            GUILayout.Space(6);
            using (new EditorGUI.DisabledScope(busy))
            {
                if (GUILayout.Button("このプロジェクトを追加", EditorStyles.toolbarButton))
                {
                    IndexProject();
                }
            }
        }

        void DrawStatus()
        {
            if (unreachable)
            {
                using (new EditorGUILayout.HorizontalScope(EditorStyles.helpBox))
                {
                    if (!File.Exists(DesktopApp))
                    {
                        EditorGUILayout.LabelField("管理アプリが起動していません", EditorStyles.wordWrappedLabel);
                    }
                    else if (GUILayout.Button("管理アプリを起動"))
                    {
                        Process.Start(DesktopApp);
                    }
                }

                return;
            }

            string line;
            if (status == null)
            {
                line = "接続しています…";
            }
            else if (status.Indexing)
            {
                line = $"{status.Step.Done} / {status.Step.Total}";
            }
            else
            {
                line = $"パッケージ {status.Packages}";
            }

            if (notice != null)
            {
                EditorGUILayout.HelpBox(notice, MessageType.Info);
            }

            var spinning = status != null && status.Indexing;
            var content = spinning
                ? new GUIContent(line, EditorGUIUtility.IconContent($"WaitSpin{(int)(EditorApplication.timeSinceStartup * 10) % 12:00}").image)
                : new GUIContent(line);
            EditorGUILayout.LabelField(content, EditorStyles.miniLabel);
            if (spinning)
            {
                Repaint();
            }
        }
    }
}
