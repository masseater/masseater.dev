using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace PeerSelectionHud.PeerSelectionHudCode;

[ModInitializer(nameof(Initialize))]
public static class MainFile
{
    public const string ModId = "PeerSelectionHud";

    internal static Logger Log { get; } = new(ModId, LogType.Generic);

    public static void Initialize()
    {
        new Harmony(ModId).PatchAll(typeof(MainFile).Assembly);
        Log.Info($"{ModId} を読み込みました");
    }
}
