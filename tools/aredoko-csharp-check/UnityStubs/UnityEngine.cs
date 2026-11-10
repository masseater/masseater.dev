using System;

namespace UnityEngine
{
    public enum HideFlags { HideAndDontSave = 61 }
    public enum CameraClearFlags { SolidColor = 2 }
    public enum RenderTextureFormat { ARGB32 = 0 }
    public enum RenderTextureReadWrite { sRGB = 2 }
    public enum TextureFormat { RGBA32 = 4 }
    public enum ScaleMode { ScaleToFit = 2 }
    public enum TextAnchor { UpperCenter = 1 }
    public enum TextClipping { Clip = 1 }
    public enum EventType { MouseDown = 0, KeyDown = 4 }
    public enum KeyCode { Return = 13 }

    public class Object
    {
        public HideFlags hideFlags { get; set; }
        public int GetInstanceID() => throw null;
        public static void DestroyImmediate(Object obj, bool allowDestroyingAssets = false) => throw null;
    }

    public class ScriptableObject : Object { }

    public sealed class GameObject : Object
    {
        public T[] GetComponentsInChildren<T>() => throw null;
    }

    public class Component : Object
    {
        public Transform transform => throw null;
    }

    public class Behaviour : Component { }

    public class Transform : Component
    {
        public Vector3 position { get; set; }
        public Quaternion rotation { get; set; }
    }

    public class Renderer : Component
    {
        public Bounds bounds { get; set; }
    }

    public sealed class Camera : Behaviour
    {
        public float fieldOfView { get; set; }
        public float nearClipPlane { get; set; }
        public float farClipPlane { get; set; }
        public CameraClearFlags clearFlags { get; set; }
        public Color backgroundColor { get; set; }
    }

    public sealed class Light : Behaviour
    {
        public float intensity { get; set; }
    }

    public class Texture : Object
    {
        public int width => throw null;
        public int height => throw null;
    }

    public sealed class Texture2D : Texture
    {
        public Texture2D(int width, int height) => throw null;
        public Texture2D(int width, int height, TextureFormat textureFormat, bool mipChain) => throw null;
        public void ReadPixels(Rect source, int destX, int destY, bool recalculateMipMaps = true) => throw null;
        public void Apply(bool updateMipmaps = true, bool makeNoLongerReadable = false) => throw null;
    }

    public class RenderTexture : Texture
    {
        public static RenderTexture active { get; set; }
        public static RenderTexture GetTemporary(int width, int height, int depthBuffer, RenderTextureFormat format, RenderTextureReadWrite readWrite) => throw null;
        public static void ReleaseTemporary(RenderTexture temp) => throw null;
    }

    public static class ImageConversion
    {
        public static bool LoadImage(this Texture2D tex, byte[] data) => throw null;
        public static byte[] EncodeToPNG(this Texture2D tex) => throw null;
    }

    public class Graphics
    {
        public static void Blit(Texture source, RenderTexture dest) => throw null;
    }

    public struct Vector2
    {
        public Vector2(float x, float y) => throw null;
        public static Vector2 zero => throw null;
    }

    public struct Vector3
    {
        public static Vector3 forward => throw null;
        public float magnitude => throw null;
        public static Vector3 operator -(Vector3 a, Vector3 b) => throw null;
        public static Vector3 operator *(Vector3 a, float d) => throw null;
    }

    public struct Quaternion
    {
        public static Quaternion Euler(float x, float y, float z) => throw null;
        public static Vector3 operator *(Quaternion rotation, Vector3 point) => throw null;
    }

    public struct Color
    {
        public Color(float r, float g, float b, float a) => throw null;
    }

    public struct Rect
    {
        public Rect(float x, float y, float width, float height) => throw null;
        public float x => throw null;
        public float y => throw null;
        public float yMax => throw null;
        public float width => throw null;
        public bool Contains(Vector2 point) => throw null;
    }

    public struct Bounds
    {
        public Vector3 center => throw null;
        public Vector3 extents => throw null;
        public void Encapsulate(Bounds bounds) => throw null;
    }

    public struct Mathf
    {
        public const float Deg2Rad = (float)Math.PI * 2F / 360F;
        public static float Sin(float f) => throw null;
        public static int Max(int a, int b) => throw null;
        public static int Min(int a, int b) => throw null;
        public static int FloorToInt(float f) => throw null;
    }

    public class Application
    {
        public static string dataPath => throw null;
        public static void OpenURL(string url) => throw null;
    }

    public class Debug
    {
        public static void LogWarning(object message) => throw null;
    }

    public sealed class Event
    {
        public static Event current => throw null;
        public EventType type => throw null;
        public Vector2 mousePosition => throw null;
        public int clickCount => throw null;
        public bool shift => throw null;
        public KeyCode keyCode => throw null;
        public void Use() => throw null;
    }

    public class GUIContent
    {
        public GUIContent(string text) => throw null;
        public GUIContent(string text, Texture image) => throw null;
        public GUIContent(string text, string tooltip) => throw null;
        public Texture image { get; set; }
    }

    public sealed class GUIStyle
    {
        public GUIStyle(GUIStyle other) => throw null;
        public TextAnchor alignment { get; set; }
        public bool wordWrap { get; set; }
        public TextClipping clipping { get; set; }
    }

    public sealed class GUILayoutOption { }

    public class GUILayout
    {
        public static GUILayoutOption Width(float width) => throw null;
        public static GUILayoutOption Height(float height) => throw null;
        public static GUILayoutOption MinWidth(float minWidth) => throw null;
        public static GUILayoutOption ExpandWidth(bool expand) => throw null;
        public static GUILayoutOption ExpandHeight(bool expand) => throw null;
        public static void Label(Texture image, params GUILayoutOption[] options) => throw null;
        public static bool Button(string text, params GUILayoutOption[] options) => throw null;
        public static bool Button(string text, GUIStyle style, params GUILayoutOption[] options) => throw null;
        public static float HorizontalSlider(float value, float leftValue, float rightValue, params GUILayoutOption[] options) => throw null;
        public static void Space(float pixels) => throw null;
        public static void FlexibleSpace() => throw null;
    }

    public class GUILayoutUtility
    {
        public static Rect GetRect(float width, float height, params GUILayoutOption[] options) => throw null;
    }

    public class GUI
    {
        public static void Label(Rect position, string text, GUIStyle style) => throw null;
        public static void Label(Rect position, GUIContent content, GUIStyle style) => throw null;
        public static void DrawTexture(Rect position, Texture image, ScaleMode scaleMode) => throw null;
        public static void SetNextControlName(string name) => throw null;
        public static string GetNameOfFocusedControl() => throw null;

        public abstract class Scope : IDisposable
        {
            public void Dispose() => throw null;
        }
    }
}
