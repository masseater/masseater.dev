using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using Sts2Mods.Common;

namespace MapDrawUndo.MapDrawUndoCode;

/// <summary>
/// Harmony パッチ。対象は公開デコンパイルの NMapDrawings / NMapScreen で確認したもの。
/// メソッド名は nameof で書き、引数名は元のメソッドと同じにする (Harmony は名前で引数を渡す)。
/// private のメンバーは Krafs.Publicizer (csproj の Publicize) で参照している。
/// Harmony.PatchAll は入れ子の型も探すので、パッチはここにまとめる。
/// </summary>
internal static class Patches
{
    /// <summary>マップの線の同期が始まるときに Undo の受信も始める。</summary>
    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.Initialize))]
    internal static class NMapDrawingsInitializePatch
    {
        internal static void Postfix(NMapDrawings __instance, INetGameService netService) =>
            UndoNet.Attach(__instance, netService);
    }

    /// <summary>マップの線の同期が終わるときに Undo の受信もやめる。</summary>
    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings._ExitTree))]
    internal static class NMapDrawingsExitTreePatch
    {
        internal static void Prefix() => UndoNet.Detach();
    }

    /// <summary>相手の線を受け取ったあと、描き終わった保留中の Undo を反映する。</summary>
    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.HandleDrawingMessage))]
    internal static class NMapDrawingsHandleDrawingMessagePatch
    {
        internal static void Postfix(NMapDrawings __instance, ulong senderId) =>
            DrawingUndo.FlushPending(__instance, senderId);
    }

    /// <summary>Clear ボタンで線が全部消えたら、その人の保留中の Undo を捨てる。</summary>
    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.ClearAllLinesForPlayer))]
    internal static class NMapDrawingsClearAllLinesForPlayerPatch
    {
        internal static void Postfix(NMapDrawings.DrawingState state) =>
            DrawingUndo.ForgetPending(state.playerId);
    }

    /// <summary>マップが切り替わって全員の線が消えたら、保留中の Undo を全部捨てる。</summary>
    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.ClearAllLines))]
    internal static class NMapDrawingsClearAllLinesPatch
    {
        internal static void Postfix() => DrawingUndo.Reset();
    }

    /// <summary>マップ画面が開いているあいだの Ctrl+Z / Cmd+Z を拾う。</summary>
    [HarmonyPatch(typeof(NMapScreen), nameof(NMapScreen._Input))]
    internal static class NMapScreenInputPatch
    {
        internal static void Postfix(NMapScreen __instance, InputEvent inputEvent)
        {
            if (!__instance.IsOpen || !__instance.IsVisibleInTree() || !Shortcuts.IsUndo(inputEvent))
            {
                return;
            }

            if (DrawingUndo.TryUndoLocal(__instance.Drawings))
            {
                UndoNet.SendUndoLater(__instance);
            }

            __instance.GetViewport().SetInputAsHandled();
        }
    }
}
