#nullable enable

using System;
using System.Collections.Generic;
using Aredoko.Client;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    sealed class PreviewCache : IDisposable
    {
        readonly Dictionary<string, Texture2D?> textures = new Dictionary<string, Texture2D?>();
        readonly Action repaint;

        public PreviewCache(Action repaint)
        {
            this.repaint = repaint;
        }

        public Texture Get(SearchResult result)
        {
            if (result.PackageKind == PackageKind.Project)
            {
                return ProjectPreview(result);
            }

            if (!result.HasPreview)
            {
                return Labels.Icon(result.Kind);
            }

            var key = KeyOf(result);
            if (textures.TryGetValue(key, out var texture))
            {
                return texture != null ? texture : Labels.Icon(result.Kind);
            }

            textures[key] = null;
            Load(key, result.AssetId);
            return Labels.Icon(result.Kind);
        }

        public void Dispose()
        {
            foreach (var texture in textures.Values)
            {
                if (texture != null)
                {
                    UnityEngine.Object.DestroyImmediate(texture);
                }
            }

            textures.Clear();
        }

        static string KeyOf(SearchResult result) => $"{result.AssetId}/{result.Guid}";

        static Texture ProjectPreview(SearchResult result)
        {
            var path = AssetDatabase.GUIDToAssetPath(result.Guid);
            var asset = string.IsNullOrEmpty(path) ? null : AssetDatabase.LoadMainAssetAtPath(path);
            if (asset == null)
            {
                return Labels.Icon(result.Kind);
            }

            var preview = AssetPreview.GetAssetPreview(asset);
            return preview != null ? preview : AssetPreview.GetMiniThumbnail(asset);
        }

        async void Load(string key, long assetId)
        {
            try
            {
                var preview = await AredokoClient.Shared.Call(AredokoRpcs.GetPreview, new GetPreviewPayload { AssetId = assetId });
                var texture = new Texture2D(2, 2) { hideFlags = HideFlags.HideAndDontSave };
                if (texture.LoadImage(Convert.FromBase64String(preview.Png)))
                {
                    textures[key] = texture;
                }
                else
                {
                    UnityEngine.Object.DestroyImmediate(texture);
                }
            }
            catch (AredokoException)
            {
            }

            repaint();
        }
    }
}
