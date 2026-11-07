using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace PeerSelectionHud.PeerSelectionHudCode;

/// <summary>Mod の入口。ゲームの Mod ローダーが <see cref="Initialize"/> を呼ぶ。</summary>
[ModInitializer(nameof(Initialize))]
public static class MainFile
{
    /// <summary>マニフェスト (PeerSelectionHud.json) の id と同じ値。</summary>
    public const string ModId = "PeerSelectionHud";

    internal static Logger Log { get; } = new(ModId, LogType.Generic);

    /// <summary>Harmony パッチをすべて当てる。</summary>
    public static void Initialize()
    {
        new Harmony(ModId).PatchAll(typeof(MainFile).Assembly);
        Log.Info($"{ModId} を読み込みました");
    }
}
