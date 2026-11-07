#nullable enable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Aredoko.Client;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Indexing
{
    public static class ProjectIndexer
    {
        const int BatchSize = 40;
        const int PreviewWaitFrames = 300;

        static readonly HashSet<string> PreviewExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".png", ".jpg", ".jpeg", ".tga", ".psd", ".tif", ".tiff", ".bmp", ".exr", ".hdr",
            ".fbx", ".obj", ".blend", ".dae", ".mat", ".prefab",
        };

        public static async Task<int> Run(Action<string> report)
        {
            var projectPath = Path.GetDirectoryName(Application.dataPath)!.Replace('\\', '/');
            var paths = AssetDatabase.FindAssets("", new[] { "Assets" })
                .Select(AssetDatabase.GUIDToAssetPath)
                .Where(path => !AssetDatabase.IsValidFolder(path))
                .Distinct()
                .ToArray();
            for (var start = 0; start < paths.Length; start += BatchSize)
            {
                report($"プロジェクトを追加しています… {start} / {paths.Length}");
                var batch = paths.Skip(start).Take(BatchSize).ToArray();
                var assets = await Describe(batch);
                await AredokoClient.Shared.Call(AredokoRpcs.PutProjectAssets, new PutProjectAssetsPayload { ProjectPath = projectPath, Assets = assets, Complete = false });
            }

            await AredokoClient.Shared.Call(AredokoRpcs.PutProjectAssets, new PutProjectAssetsPayload { ProjectPath = projectPath, Assets = Array.Empty<ProjectAsset>(), Complete = true });
            return paths.Length;
        }

        static async Task<ProjectAsset[]> Describe(string[] paths)
        {
            var objects = paths.Select(path => PreviewExtensions.Contains(Path.GetExtension(path)) ? AssetDatabase.LoadMainAssetAtPath(path) : null).ToArray();
            foreach (var target in objects.Where(target => target != null))
            {
                AssetPreview.GetAssetPreview(target);
            }

            for (var frame = 0; frame < PreviewWaitFrames && objects.Any(target => target != null && AssetPreview.IsLoadingAssetPreview(target.GetInstanceID())); frame++)
            {
                await NextFrame();
            }

            return paths.Select((path, index) => new ProjectAsset
            {
                Guid = AssetDatabase.AssetPathToGUID(path),
                Pathname = path,
                Previews = PreviewOf(objects[index]),
            }).ToArray();
        }

        static string[] PreviewOf(UnityEngine.Object? target)
        {
            if (target == null)
            {
                return Array.Empty<string>();
            }

            if (target is GameObject model)
            {
                var views = ModelViews.Render(model);
                if (views.Length > 0)
                {
                    return views.Select(Convert.ToBase64String).ToArray();
                }
            }

            var preview = AssetPreview.GetAssetPreview(target);
            return preview == null ? Array.Empty<string>() : new[] { Convert.ToBase64String(EncodePng(preview)) };
        }

        static byte[] EncodePng(Texture2D source)
        {
            var target = RenderTexture.GetTemporary(source.width, source.height, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
            var previous = RenderTexture.active;
            try
            {
                Graphics.Blit(source, target);
                RenderTexture.active = target;
                var readable = new Texture2D(source.width, source.height, TextureFormat.RGBA32, false);
                readable.ReadPixels(new Rect(0, 0, source.width, source.height), 0, 0);
                readable.Apply();
                var png = readable.EncodeToPNG();
                UnityEngine.Object.DestroyImmediate(readable);
                return png;
            }
            finally
            {
                RenderTexture.active = previous;
                RenderTexture.ReleaseTemporary(target);
            }
        }

        static Task NextFrame()
        {
            var completion = new TaskCompletionSource<bool>();
            void Step()
            {
                EditorApplication.update -= Step;
                completion.SetResult(true);
            }

            EditorApplication.update += Step;
            return completion.Task;
        }
    }
}
