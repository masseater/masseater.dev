using System;
using UnityEngine;
using Object = UnityEngine.Object;

namespace UnityEditor
{
    public enum MessageType { Info = 1 }

    [AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public sealed class MenuItem : Attribute
    {
        public MenuItem(string itemName) => throw null;
    }

    public class EditorWindow : ScriptableObject
    {
        public static T GetWindow<T>() where T : EditorWindow => throw null;
        public GUIContent titleContent { get; set; }
        public Vector2 minSize { get; set; }
        public Rect position { get; set; }
        public void Show() => throw null;
        public void Repaint() => throw null;
    }

    public sealed class EditorApplication
    {
        public delegate void CallbackFunction();
        public static CallbackFunction update;
        public static double timeSinceStartup => throw null;
    }

    public sealed class EditorStyles
    {
        public static GUIStyle miniLabel => throw null;
        public static GUIStyle boldLabel => throw null;
        public static GUIStyle miniBoldLabel => throw null;
        public static GUIStyle centeredGreyMiniLabel => throw null;
        public static GUIStyle wordWrappedMiniLabel => throw null;
        public static GUIStyle wordWrappedLabel => throw null;
        public static GUIStyle miniButton => throw null;
        public static GUIStyle toolbar => throw null;
        public static GUIStyle toolbarButton => throw null;
        public static GUIStyle toolbarDropDown => throw null;
        public static GUIStyle helpBox => throw null;
        public static GUIStyle toolbarSearchField => throw null;
    }

    public sealed class EditorGUI
    {
        public static bool actionKey => throw null;
        public static void DrawRect(Rect rect, Color color) => throw null;

        public struct DisabledScope : IDisposable
        {
            public DisabledScope(bool disabled) => throw null;
            public void Dispose() => throw null;
        }
    }

    public sealed class EditorGUILayout
    {
        public static void LabelField(string label, GUIStyle style, params GUILayoutOption[] options) => throw null;
        public static void LabelField(GUIContent label, GUIStyle style, params GUILayoutOption[] options) => throw null;
        public static string TextField(string text, GUIStyle style, params GUILayoutOption[] options) => throw null;
        public static void HelpBox(string message, MessageType type) => throw null;

        public class HorizontalScope : GUI.Scope
        {
            public HorizontalScope(params GUILayoutOption[] options) => throw null;
            public HorizontalScope(GUIStyle style, params GUILayoutOption[] options) => throw null;
        }

        public class VerticalScope : GUI.Scope
        {
            public VerticalScope(GUIStyle style, params GUILayoutOption[] options) => throw null;
        }

        public class ScrollViewScope : GUI.Scope
        {
            public ScrollViewScope(Vector2 scrollPosition, params GUILayoutOption[] options) => throw null;
            public Vector2 scrollPosition => throw null;
        }
    }

    public sealed class EditorGUIUtility
    {
        public static GUIContent IconContent(string name, string text = null) => throw null;
        public static void PingObject(Object obj) => throw null;
    }

    public sealed class AssetDatabase
    {
        public static string[] FindAssets(string filter, string[] searchInFolders) => throw null;
        public static string GUIDToAssetPath(string guid) => throw null;
        public static string AssetPathToGUID(string path) => throw null;
        public static bool IsValidFolder(string path) => throw null;
        public static Object LoadMainAssetAtPath(string assetPath) => throw null;
        public static void ImportPackage(string packagePath, bool interactive) => throw null;
    }

    public sealed class AssetPreview
    {
        public static Texture2D GetAssetPreview(Object asset) => throw null;
        public static Texture2D GetMiniThumbnail(Object obj) => throw null;
        public static bool IsLoadingAssetPreview(int instanceID) => throw null;
    }

    public sealed class Selection
    {
        public static Object activeObject { get; set; }
    }

    public sealed class GenericMenu
    {
        public delegate void MenuFunction();
        public void AddItem(GUIContent content, bool on, MenuFunction func) => throw null;
        public void AddSeparator(string path) => throw null;
        public void ShowAsContext() => throw null;
    }

    public class PreviewRenderUtility
    {
        public Camera camera => throw null;
        public Light[] lights => throw null;
        public Color ambientColor { get; set; }
        public GameObject InstantiatePrefabInScene(GameObject prefab) => throw null;
        public void BeginStaticPreview(Rect r) => throw null;
        public void Render(bool allowScriptableRenderPipeline = false, bool updatefov = true) => throw null;
        public Texture2D EndStaticPreview() => throw null;
        public void Cleanup() => throw null;
    }
}
