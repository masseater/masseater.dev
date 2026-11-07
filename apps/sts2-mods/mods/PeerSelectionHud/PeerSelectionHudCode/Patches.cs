using HarmonyLib;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Runs;

namespace PeerSelectionHud.PeerSelectionHudCode;

/// <summary>
/// Harmony パッチ。対象は公開デコンパイルの NMapScreen で確認したもの。
/// メソッド名は nameof で書き、引数名は元のメソッドと同じにする (Harmony は名前で引数を渡す)。
/// </summary>
internal static class Patches
{
    /// <summary>
    /// ラン開始時 (ロード含む) にマップ画面が初期化されるところで表示を作る。
    /// この時点で RunManager の各 Synchronizer は用意済み (NMapScreen.Initialize 自身が使っている)。
    /// </summary>
    [HarmonyPatch(typeof(NMapScreen), nameof(NMapScreen.Initialize))]
    internal static class NMapScreenInitializePatch
    {
        internal static void Postfix(NMapScreen __instance, RunState runState) =>
            PeerHud.Attach(__instance, runState);
    }
}
