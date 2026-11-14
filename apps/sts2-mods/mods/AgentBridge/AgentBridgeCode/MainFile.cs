using Godot;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
using Logger = MegaCrit.Sts2.Core.Logging.Logger;

namespace AgentBridge.AgentBridgeCode;

/// <summary>Mod の入口。ゲームの状態と操作を localhost の HTTP でエージェントに渡す。</summary>
[ModInitializer(nameof(Initialize))]
public static class MainFile
{
    /// <summary>マニフェスト (AgentBridge.json) の id と同じ値。</summary>
    public const string ModId = "AgentBridge";

    /// <summary>ブリッジの版。</summary>
    public const string Version = "0.1.0";

    internal static Logger Log { get; } = new(ModId, LogType.Generic);

    /// <summary>メインスレッドの処理を受け付け、HTTP サーバーを立てる。</summary>
    public static void Initialize()
    {
        var tree = (SceneTree)Engine.GetMainLoop();
        MainThread.Attach(tree);
        BridgeServer.Start(BridgePort.Resolve());
    }
}
