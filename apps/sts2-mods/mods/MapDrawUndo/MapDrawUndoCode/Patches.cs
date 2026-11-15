using Godot;
using HarmonyLib;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using Sts2Mods.Common;

namespace MapDrawUndo.MapDrawUndoCode;

internal static class Patches
{
    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.Initialize))]
    internal static class NMapDrawingsInitializePatch
    {
        internal static void Postfix(NMapDrawings __instance, INetGameService netService) =>
            UndoNet.Attach(__instance, netService);
    }

    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings._ExitTree))]
    internal static class NMapDrawingsExitTreePatch
    {
        internal static void Prefix() => UndoNet.Detach();
    }

    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.HandleDrawingMessage))]
    internal static class NMapDrawingsHandleDrawingMessagePatch
    {
        internal static void Postfix(NMapDrawings __instance, ulong senderId) =>
            DrawingUndo.FlushPending(__instance, senderId);
    }

    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.ClearAllLinesForPlayer))]
    internal static class NMapDrawingsClearAllLinesForPlayerPatch
    {
        internal static void Postfix(NMapDrawings.DrawingState state) =>
            DrawingUndo.ForgetPending(state.playerId);
    }

    [HarmonyPatch(typeof(NMapDrawings), nameof(NMapDrawings.ClearAllLines))]
    internal static class NMapDrawingsClearAllLinesPatch
    {
        internal static void Postfix() => DrawingUndo.Reset();
    }

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
