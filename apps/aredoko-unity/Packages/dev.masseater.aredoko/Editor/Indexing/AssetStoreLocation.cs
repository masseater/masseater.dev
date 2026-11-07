#nullable enable

using System;
using System.Reflection;
using System.Threading.Tasks;
using Aredoko.Client;
using Aredoko.Protocol;

namespace Aredoko.Indexing
{
    public static class AssetStoreLocation
    {
        const string ManagerType = "UnityEditorInternal.AssetStoreCachePathManager, UnityEditor";

        static string? reported;

        public static async Task Report()
        {
            var path = Current();
            if (string.IsNullOrEmpty(path) || path == reported)
            {
                return;
            }

            await AredokoClient.Shared.Call(AredokoRpcs.PutAssetStore, new PutAssetStorePayload { Path = path });
            reported = path;
        }

        static string? Current()
        {
            var manager = Type.GetType(ManagerType);
            var config = manager?.GetMethod("GetConfig", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static)?.Invoke(null, null);
            return config?.GetType().GetProperty("path", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)?.GetValue(config) as string;
        }
    }
}
