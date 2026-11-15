using Godot;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
using Logger = MegaCrit.Sts2.Core.Logging.Logger;

namespace AgentBridge.AgentBridgeCode;

[ModInitializer(nameof(Initialize))]
public static class MainFile
{
    public const string ModId = "AgentBridge";

    public const string Version = "0.1.0";

    internal static Logger Log { get; } = new(ModId, LogType.Generic);

    public static void Initialize()
    {
        var tree = (SceneTree)Engine.GetMainLoop();
        MainThread.Attach(tree);
        BridgeServer.Start(BridgePort.Resolve());
    }
}
