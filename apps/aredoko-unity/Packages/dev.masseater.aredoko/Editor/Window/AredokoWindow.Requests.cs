#nullable enable

using System;
using System.Linq;
using Aredoko.Client;
using Aredoko.Indexing;
using Aredoko.Protocol;
using UnityEditor;
using UnityEngine;

namespace Aredoko.Window
{
    public sealed partial class AredokoWindow
    {
        async void RunSearch()
        {
            var text = query.Trim();
            searchedQuery = text;
            if (text.Length == 0)
            {
                results = Array.Empty<SearchResult>();
                selected.Clear();
                Repaint();
                return;
            }

            searching = true;
            Repaint();
            try
            {
                var found = await AredokoClient.Shared.Call(AredokoRpcs.Search, new SearchPayload { Query = text, Limit = ResultLimit, Kinds = kinds.Chosen });
                if (text == searchedQuery)
                {
                    results = found.Results;
                    selected.IntersectWith(results.Select(result => result.AssetId));
                    notice = null;
                    gridScroll = Vector2.zero;
                }
            }
            catch (AredokoException exception)
            {
                Fail(exception);
            }
            finally
            {
                searching = false;
                Repaint();
            }
        }

        void Fail(AredokoException exception)
        {
            if (exception.Unreachable)
            {
                unreachable = true;
                return;
            }

            notice = exception.Message;
            UnityEngine.Debug.LogWarning($"aredoko: {exception.Message} (trace {exception.TraceId})");
        }

        async void RefreshStatus()
        {
            try
            {
                status = await AredokoClient.Shared.Call(AredokoRpcs.GetStatus);
                unreachable = false;
                await AssetStoreLocation.Report();
            }
            catch (AredokoException exception)
            {
                status = null;
                Fail(exception);
            }

            Repaint();
        }

        async void LoadPackage(long packageId)
        {
            if (packages.ContainsKey(packageId))
            {
                return;
            }

            try
            {
                packages[packageId] = await AredokoClient.Shared.Call(AredokoRpcs.GetPackage, new GetPackagePayload { Id = packageId });
                Repaint();
            }
            catch (AredokoException exception)
            {
                Fail(exception);
            }
        }

        async void Import()
        {
            var ids = results.Where(result => selected.Contains(result.AssetId) && result.PackageKind == PackageKind.Unitypackage).Select(result => result.AssetId).ToArray();
            if (ids.Length == 0)
            {
                return;
            }

            busy = true;
            try
            {
                var extracted = await AredokoClient.Shared.Call(AredokoRpcs.Extract, new ExtractPayload { AssetIds = ids });
                notice = extracted.Missing.Length > 0 ? $"元のパッケージに無い参照が {extracted.Missing.Length} 件あります" : null;
                AssetDatabase.ImportPackage(extracted.Path, true);
            }
            catch (AredokoException exception)
            {
                Fail(exception);
            }
            finally
            {
                busy = false;
                Repaint();
            }
        }

        async void IndexProject()
        {
            busy = true;
            try
            {
                var count = await ProjectIndexer.Run(progress => notice = progress);
                notice = $"{count} 個のアセットを追加しました";
            }
            catch (AredokoException exception)
            {
                Fail(exception);
            }
            finally
            {
                busy = false;
                Repaint();
            }
        }
    }
}
