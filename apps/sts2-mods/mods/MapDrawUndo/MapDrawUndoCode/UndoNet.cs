using Godot;
using MegaCrit.Sts2.Core.Multiplayer.Game;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace MapDrawUndo.MapDrawUndoCode;

/// <summary>
/// Undo をほかのプレイヤーに同期する。
/// </summary>
/// <remarks>
/// 相手にもこの Mod が入っている前提。入っていない相手には Undo が届かず、線は相手の画面に残る。
/// 受信側の登録・解除は、ゲームが線のメッセージを登録・解除する NMapDrawings.Initialize / _ExitTree に合わせる。
/// </remarks>
internal static class UndoNet
{
    // 線のメッセージは 50ms ごとにまとめて送られる (NMapDrawings.QueueOrSendEvent)。
    // 直前に描いた線の送信が終わってから Undo を送るための待ち時間
    private const double SendDelaySeconds = 0.15;

    // 登録と解除で同じインスタンスを渡す必要がある
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

    /// <summary>少し待ってから Undo を全員に送る。一人プレイなら何もしない。</summary>
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
        // 待っているあいだにマップ画面が閉じられていたら送らない
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
