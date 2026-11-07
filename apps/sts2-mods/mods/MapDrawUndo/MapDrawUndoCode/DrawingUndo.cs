using Godot;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace MapDrawUndo.MapDrawUndoCode;

/// <summary>
/// マップの線を 1 本ずつ消す処理。
/// </summary>
/// <remarks>
/// ゲーム側の仕組み (公開デコンパイルの NMapDrawings で確認):
/// プレイヤーごとに <see cref="NMapDrawings.DrawingState"/> があり、1 本の線 (消しゴムの線も含む) は
/// その drawViewport の子の <see cref="Line2D"/> 1 つ。後から描いた線ほど後ろの子になる。
/// </remarks>
internal static class DrawingUndo
{
    // 相手の描きかけの線に Undo が届いたとき、描き終わりの通知が来るまで消すのを待つ線。
    // 描きかけの線を消すと、ゲームがその線に点を足そうとして解放済みオブジェクトに触ってしまう
    private static readonly Dictionary<ulong, List<Line2D>> PendingByPlayer = [];

    /// <summary>自分の最後の線を 1 本消す。消せたら true。</summary>
    internal static bool TryUndoLocal(NMapDrawings drawings)
    {
        if (drawings.IsLocalDrawing())
        {
            return false;
        }

        NMapDrawings.DrawingState state = drawings.GetDrawingStateForPlayer(drawings._netService.NetId);
        Line2D? last = FindLastLine(state);
        if (last is null)
        {
            return false;
        }

        last.QueueFree();
        return true;
    }

    /// <summary>他のプレイヤーから Undo が届いたとき、その人の最後の線を 1 本消す。</summary>
    internal static void UndoRemote(NMapDrawings drawings, ulong senderId)
    {
        NMapDrawings.DrawingState state = drawings.GetDrawingStateForPlayer(senderId);

        // 描き終わり (EndLine) は取りこぼしのある通信で届くので、Undo の方が先に着くことがある。
        // その場合は描きかけの線が取り消し対象なので、隠しておいて描き終わってから消す
        if (state.currentlyDrawingLine is { } drawing && !IsPending(senderId, drawing))
        {
            drawing.Visible = false;
            GetPending(senderId).Add(drawing);
            return;
        }

        FindLastLine(state)?.QueueFree();
    }

    /// <summary>相手の線の受信処理のあとに呼ぶ。描き終わった保留中の線を消す。</summary>
    internal static void FlushPending(NMapDrawings drawings, ulong senderId)
    {
        if (!PendingByPlayer.TryGetValue(senderId, out List<Line2D>? pending) || pending.Count == 0)
        {
            return;
        }

        Line2D? current = drawings.GetDrawingStateForPlayer(senderId).currentlyDrawingLine;
        _ = pending.RemoveAll(line =>
        {
            if (!GodotObject.IsInstanceValid(line))
            {
                return true;
            }

            if (line == current)
            {
                return false;
            }

            line.QueueFree();
            return true;
        });
    }

    /// <summary>そのプレイヤーの線が全部消されたとき (Clear ボタン) に保留を捨てる。</summary>
    internal static void ForgetPending(ulong playerId) => PendingByPlayer.Remove(playerId);

    /// <summary>マップの切り替えや画面の破棄で全員の線が消えたときに保留を捨てる。</summary>
    internal static void Reset() => PendingByPlayer.Clear();

    // 消し去り予定や保留中のものを除いた、最後に描かれた線
    private static Line2D? FindLastLine(NMapDrawings.DrawingState state)
    {
        Godot.Collections.Array<Node> children = state.drawViewport.GetChildren();
        for (int i = children.Count - 1; i >= 0; i--)
        {
            if (children[i] is Line2D line
                && line != state.currentlyDrawingLine
                && !line.IsQueuedForDeletion()
                && !IsPending(state.playerId, line))
            {
                return line;
            }
        }

        return null;
    }

    private static bool IsPending(ulong playerId, Line2D line) =>
        PendingByPlayer.TryGetValue(playerId, out List<Line2D>? pending) && pending.Contains(line);

    private static List<Line2D> GetPending(ulong playerId)
    {
        if (!PendingByPlayer.TryGetValue(playerId, out List<Line2D>? pending))
        {
            pending = [];
            PendingByPlayer[playerId] = pending;
        }

        return pending;
    }
}
