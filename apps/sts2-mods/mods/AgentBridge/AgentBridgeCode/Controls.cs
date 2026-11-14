using System.Globalization;
using Godot;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.Overlays;

namespace AgentBridge.AgentBridgeCode;

/// <summary>
/// 画面に見えていて押せる部品を集める。ゲームの部品 (NClickableControl・カードの枠) と Godot の BaseButton を対象にし、
/// Mod が足した画面も同じ方法で押せるようにする。手札のカードは play_card で出すので外す。
/// </summary>
internal static class Controls
{
    private const int MaxTextLength = 120;

    private sealed record Scan(Rect2 Screen, HashSet<Node> Covered);

    public static Protocol.Control[] Collect()
    {
        var tree = (SceneTree)Engine.GetMainLoop();
        Rect2 screen = tree.Root.GetVisibleRect();
        var found = new List<Protocol.Control>();
        Node top = NModalContainer.Instance?.OpenModal as Node ?? tree.Root;
        Walk(top, new Scan(screen, CoveredOverlays()), found);
        return [.. found];
    }

    public static Godot.Control? Find(string id)
    {
        var tree = (SceneTree)Engine.GetMainLoop();
        return tree.Root.GetNodeOrNull<Godot.Control>(id);
    }

    public static bool IsPressable(Godot.Control control) => control switch
    {
        NHandCardHolder => false,
        NCardHolder holder => holder.IsVisibleInTree(),
        NClickableControl clickable => clickable.IsVisibleInTree() && clickable.IsEnabled,
        BaseButton button => button.IsVisibleInTree() && !button.Disabled,
        _ => false,
    };

    /// <summary>重なった画面のうち一番上より下にあるものは押せないので外す。</summary>
    private static HashSet<Node> CoveredOverlays()
    {
        NOverlayStack? stack = NOverlayStack.Instance;
        if (stack is null)
        {
            return [];
        }
        IOverlayScreen? top = stack.Peek();
        return [.. stack.GetChildren().OfType<IOverlayScreen>().Where(overlay => !ReferenceEquals(overlay, top)).OfType<Node>()];
    }

    private static void Walk(Node node, Scan scan, List<Protocol.Control> found)
    {
        if (node is CanvasItem { Visible: false } || scan.Covered.Contains(node))
        {
            return;
        }
        if (node is Godot.Control control && IsPressable(control) && Target(control) is { } target)
        {
            Rect2 rect = control.GetGlobalRect();
            string id = target.GetPath().ToString();
            if (rect.HasArea() && scan.Screen.Intersects(rect) && !found.Exists(known => string.Equals(known.Id, id, StringComparison.Ordinal)))
            {
                found.Add(new Protocol.Control
                {
                    Id = id,
                    Kind = target.GetType().Name,
                    Text = Label(target),
                    X = (long)rect.Position.X,
                    Y = (long)rect.Position.Y,
                    Width = (long)rect.Size.X,
                    Height = (long)rect.Size.Y,
                });
            }
        }
        foreach (Node child in node.GetChildren())
        {
            Walk(child, scan, found);
        }
    }

    /// <summary>
    /// カードの当たり判定 (NCardHolderHitbox) は押しても選ばれず、持ち主の NCardHolder の Pressed で選ばれるので、持ち主を返す。
    /// 手札のカードは play_card で出すので外す。
    /// </summary>
    private static Godot.Control? Target(Godot.Control control) => control switch
    {
        NHandCardHolder => null,
        _ when control.GetParent() is NHandCardHolder => null,
        _ when control.GetParent() is NCardHolder holder => holder,
        _ => control,
    };

    private static string Label(Godot.Control control)
    {
        string text = control switch
        {
            NMapPoint point => string.Create(CultureInfo.InvariantCulture, $"map {point.Point.coord.col},{point.Point.coord.row} {point.Point.PointType}"),
            NCardHolder { CardModel: { } card } => card.Title,
            _ => string.Join(" ", Texts(control).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal)),
        };
        if (string.IsNullOrWhiteSpace(text))
        {
            text = control.Name.ToString();
        }
        return text.Length > MaxTextLength ? text[..MaxTextLength] : text;
    }

    private static IEnumerable<string> Texts(Node node)
    {
        switch (node)
        {
            case CanvasItem { Visible: false }:
                yield break;
            case Button button:
                yield return button.Text;
                break;
            case Godot.Label label:
                yield return label.Text;
                break;
            case RichTextLabel rich:
                yield return rich.GetParsedText();
                break;
            default:
                break;
        }
        foreach (Node child in node.GetChildren())
        {
            foreach (string text in Texts(child))
            {
                yield return text;
            }
        }
    }
}
