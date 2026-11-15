using Godot;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace MapDrawUndo.MapDrawUndoCode;

internal static class UndoNet
{
    private const double SendDelaySeconds = 0.15;

    private static readonly MessageHandlerDelegate<zMapDrawUndoMessage> Handler = OnUndoReceived;

    private static INetGameService? netService;
    private static NMapDrawings? drawings;

    internal static void Attach(NMapDrawings target, INetGameService service)
    {
        Detach();
        drawings = target;
        netService = service;
        service.RegisterMessageHandler(Handler);
    }

    internal static void Detach()
    {
        netService?.UnregisterMessageHandler(Handler);
        netService = null;
        drawings = null;
        DrawingUndo.Reset();
    }

    internal static void SendUndoLater(Node anyNodeInTree)
    {
        if (netService is not { Type: not NetGameType.Singleplayer })
        {
            return;
        }

        anyNodeInTree.GetTree().CreateTimer(SendDelaySeconds).Timeout += SendUndo;
    }

    private static void SendUndo()
    {
        if (netService is { } service && drawings is not null)
        {
            service.SendMessage(new zMapDrawUndoMessage());
        }
    }

    private static void OnUndoReceived(zMapDrawUndoMessage message, ulong senderId)
    {
        if (drawings is null || !GodotObject.IsInstanceValid(drawings))
        {
            MainFile.Log.Warn($"マップ画面が無いので、プレイヤー {senderId} からの取り消しを反映できませんでした");
            return;
        }

        DrawingUndo.UndoRemote(drawings, senderId);
        MainFile.Log.Debug($"プレイヤー {senderId} の線を 1 本取り消しました");
    }
}
