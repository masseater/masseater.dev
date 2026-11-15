using HarmonyLib;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Runs;

namespace PeerSelectionHud.PeerSelectionHudCode;

internal static class Patches
{
    [HarmonyPatch(typeof(NMapScreen), nameof(NMapScreen.Initialize))]
    internal static class NMapScreenInitializePatch
    {
        internal static void Postfix(NMapScreen __instance, RunState runState) =>
            PeerHud.Attach(__instance, runState);
    }
}
