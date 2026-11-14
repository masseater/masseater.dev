using System.Globalization;
using Godot;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;

namespace AgentBridge.AgentBridgeCode;

/// <summary>
/// 画面に見えていて押せる部品を集める。ゲームの部品 (NClickableControl・カードの枠) と Godot の BaseButton を対象にし、
/// Mod が足した画面も同じ方法で押せるようにする。手札のカードは play_card で出すので外す。
/// </summary>
internal static class Controls
{
    private const int MaxTextLength = 120;

    public static Protocol.Control[] Collect()
    {
        var tree = (SceneTree)Engine.GetMainLoop();
        Rect2 screen = tree.Root.GetVisibleRect();
        var found = new List<Protocol.Control>();
        Node top = NModalContainer.Instance?.OpenModal as Node ?? tree.Root;
        Walk(top, screen, found);
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

    private static void Walk(Node node, Rect2 screen, List<Protocol.Control> found)
    {
        if (node is CanvasItem { Visible: false })
        {
            return;
        }
        if (node is Godot.Control control && IsPressable(control))
        {
            Rect2 rect = control.GetGlobalRect();
            if (rect.HasArea() && screen.Intersects(rect))
            {
                found.Add(new Protocol.Control
                {
                    Id = control.GetPath().ToString(),
                    Kind = control.GetType().Name,
                    Text = Label(control),
                    X = (long)rect.Position.X,
                    Y = (long)rect.Position.Y,
                    Width = (long)rect.Size.X,
                    Height = (long)rect.Size.Y,
                });
            }
        }
        foreach (Node child in node.GetChildren())
        {
            Walk(child, screen, found);
        }
    }

    private static string Label(Godot.Control control)
    {
        string text = control switch
        {
            NMapPoint point => string.Create(CultureInfo.InvariantCulture, $"map {point.Point.coord.col},{point.Point.coord.row} {point.Point.PointType}"),
            NCardHolder { CardModel: { } card } => card.Title,
            _ => string.Join(" ", Texts(control).Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal)),
        };
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
