using Godot;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace MapDrawUndo.MapDrawUndoCode;

internal static class DrawingUndo
{
    private static readonly Dictionary<ulong, List<Line2D>> PendingByPlayer = [];

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

    internal static void UndoRemote(NMapDrawings drawings, ulong senderId)
    {
        NMapDrawings.DrawingState state = drawings.GetDrawingStateForPlayer(senderId);

        if (state.currentlyDrawingLine is { } drawing && !IsPending(senderId, drawing))
        {
            drawing.Visible = false;
            GetPending(senderId).Add(drawing);
            return;
        }

        FindLastLine(state)?.QueueFree();
    }

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

    internal static void ForgetPending(ulong playerId) => PendingByPlayer.Remove(playerId);

    internal static void Reset() => PendingByPlayer.Clear();

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
