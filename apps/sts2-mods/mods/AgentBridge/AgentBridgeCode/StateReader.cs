using AgentBridge.Protocol;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Debug;
using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Screens.Overlays;
using MegaCrit.Sts2.Core.Runs;

namespace AgentBridge.AgentBridgeCode;

internal static class StateReader
{
    public static GameState Read()
    {
        RunState? run = RunManager.Instance.DebugOnlyGetState();
        CombatState? combat = CombatManager.Instance.IsInProgress ? CombatManager.Instance.DebugOnlyGetState() : null;
        return new GameState
        {
            Bridge = new Bridge
            {
                Version = MainFile.Version,
                GameVersion = ReleaseInfoManager.Instance.ReleaseInfo?.Version ?? "unknown",
                ClientId = BridgePort.ClientId,
                Port = BridgeServer.Port,
            },
            Frame = (long)Engine.GetProcessFrames(),
            Busy = IsBusy(),
            Scene = NGame.Instance?.RootSceneContainer.CurrentScene?.GetType().Name ?? "none",
            Overlays = Overlays(),
            Run = run is null ? null : RunReader.Read(run),
            Combat = combat is null || run is null ? null : CombatReader.Read(combat, LocalContext.GetMe(run)),
            Controls = Controls.Collect(),
        };
    }

    private static bool IsBusy()
    {
        if (NGame.Instance?.Transition.InTransition == true)
        {
            return true;
        }
        RunManager runManager = RunManager.Instance;
        return runManager.IsInProgress && (runManager.ActionExecutor.IsRunning || !runManager.ActionQueueSet.IsEmpty);
    }

    private static string[] Overlays()
    {
        IEnumerable<object> overlays = NOverlayStack.Instance?.GetChildren().OfType<IOverlayScreen>() ?? [];
        IEnumerable<object> modal = NModalContainer.Instance?.OpenModal is { } open ? [open] : [];
        return [.. overlays.Concat(modal).Select(screen => screen.GetType().Name)];
    }
}
