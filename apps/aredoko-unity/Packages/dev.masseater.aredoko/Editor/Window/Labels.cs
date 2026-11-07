#nullable enable

using System.Collections.Generic;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    static class Labels
    {
        static readonly Dictionary<AssetKind, string> KindNames = new Dictionary<AssetKind, string>
        {
            [AssetKind.Texture] = "テクスチャ",
            [AssetKind.Model] = "3D モデル",
            [AssetKind.Material] = "マテリアル",
            [AssetKind.Prefab] = "プレハブ",
            [AssetKind.Shader] = "シェーダー",
            [AssetKind.Animation] = "アニメーション",
            [AssetKind.Audio] = "オーディオ",
            [AssetKind.Scene] = "シーン",
            [AssetKind.Script] = "スクリプト",
            [AssetKind.Other] = "その他",
        };

        static readonly Dictionary<AssetKind, string> KindIcons = new Dictionary<AssetKind, string>
        {
            [AssetKind.Texture] = "Texture Icon",
            [AssetKind.Model] = "PrefabModel Icon",
            [AssetKind.Material] = "Material Icon",
            [AssetKind.Prefab] = "Prefab Icon",
            [AssetKind.Shader] = "Shader Icon",
            [AssetKind.Animation] = "AnimationClip Icon",
            [AssetKind.Audio] = "AudioClip Icon",
            [AssetKind.Scene] = "SceneAsset Icon",
            [AssetKind.Script] = "cs Script Icon",
            [AssetKind.Other] = "DefaultAsset Icon",
        };

        public static readonly AssetKind[] Kinds =
        {
            AssetKind.Prefab, AssetKind.Model, AssetKind.Material, AssetKind.Texture, AssetKind.Shader,
            AssetKind.Animation, AssetKind.Audio, AssetKind.Scene, AssetKind.Script, AssetKind.Other,
        };

        public static string Kind(AssetKind kind) => KindNames[kind];

        public static Texture Icon(AssetKind kind) => EditorGUIUtility.IconContent(KindIcons[kind]).image;

        public static string FileName(string pathname)
        {
            var slash = pathname.LastIndexOf('/');
            return slash < 0 ? pathname : pathname.Substring(slash + 1);
        }
    }
}
