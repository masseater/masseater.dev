using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace __MOD__.__MOD__Code;

[ModInitializer(nameof(Initialize))]
public static class MainFile
{
    public const string ModId = "__MOD__";

    internal static Logger Log { get; } = new(ModId, LogType.Generic);

    public static void Initialize()
    {
        new Harmony(ModId).PatchAll(typeof(MainFile).Assembly);
        Log.Info($"{ModId} を読み込みました");
    }
}
