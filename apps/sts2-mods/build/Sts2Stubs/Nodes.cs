// sts2.dll の Godot ノードのスタブ。Sts2Stubs.csproj の説明を参照。
// private のメンバーも Krafs.Publicizer を使う Mod のために public で書いている (実物では private)。

namespace MegaCrit.Sts2.Core.Nodes
{
    using Godot;

    public class NGame : Control
    {
        public static NGame? Instance => throw null!;

        public NSceneContainer RootSceneContainer => throw null!;

        public NRun? CurrentRunNode => throw null!;
    }

    public class NRun : Control
    {
        public static NRun? Instance => throw null!;
    }

    public class NSceneContainer : Control
    {
        public Control? CurrentScene => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Nodes.Screens.Map
{
    using Godot;
    using MegaCrit.Sts2.Core.Map;
    using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
    using MegaCrit.Sts2.Core.Multiplayer.Game;
    using MegaCrit.Sts2.Core.Multiplayer.Game.PeerInput;
    using MegaCrit.Sts2.Core.Multiplayer.Messages.Game.Flavor;
    using MegaCrit.Sts2.Core.Runs;

    public abstract class NMapPoint : NButton
    {
        public MapPoint Point => throw null!;
    }

    public enum DrawingMode
    {
        None,
        Drawing,
        Erasing,
    }

    public class NMapScreen : Control
    {
        public static NMapScreen? Instance => throw null!;

        public bool IsOpen => throw null!;

        public NMapDrawings Drawings => throw null!;

        public void Initialize(RunState runState) => throw null!;

        public override void _Input(InputEvent inputEvent) => throw null!;
    }

    public class NMapDrawings : Control
    {
        // 実物では private class。プレイヤーごとの描画状態。各線は drawViewport の子の Line2D
        public class DrawingState
        {
            public DrawingMode? overrideDrawingMode;

            public DrawingMode drawingMode;

            public ulong playerId;

            public Line2D? currentlyDrawingLine;

            public SubViewport drawViewport = null!;

            public bool IsDrawing => throw null!;
        }

        // 実物では private
        public INetGameService _netService = null!;

        // 実物では private
        public IPlayerCollection _playerCollection = null!;

        public void Initialize(INetGameService netService, IPlayerCollection playerCollection, PeerInputSynchronizer inputSynchronizer) => throw null!;

        public override void _ExitTree() => throw null!;

        public void BeginLineLocal(Vector2 position, DrawingMode? overrideDrawingMode) => throw null!;

        public void StopLineLocal() => throw null!;

        public void ClearDrawnLinesLocal() => throw null!;

        public bool IsDrawing(ulong playerId) => throw null!;

        public bool IsLocalDrawing() => throw null!;

        // 実物では private。無ければ作って返す
        public DrawingState GetDrawingStateForPlayer(ulong playerId) => throw null!;

        // 実物では private。相手の線の受信処理
        public void HandleDrawingMessage(MapDrawingMessage message, ulong senderId) => throw null!;

        // 実物では private。Clear ボタン (自分・相手) で呼ばれる
        public void ClearAllLinesForPlayer(DrawingState state) => throw null!;

        // マップ切り替え時に全員分を消す
        public void ClearAllLines() => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Nodes.GodotExtensions
{
    using Godot;

    public class NClickableControl : Control
    {
        public bool IsEnabled => throw null!;

        public void ForceClick() => throw null!;
    }

    public class NButton : NClickableControl
    {
    }
}

namespace MegaCrit.Sts2.Core.Nodes.Cards.Holders
{
    using Godot;
    using MegaCrit.Sts2.Core.Models;

    public abstract class NCardHolder : Control
    {
        public new class SignalName : Control.SignalName
        {
            public static readonly StringName Pressed = "Pressed";
        }

        public virtual CardModel? CardModel => throw null!;
    }

    public class NHandCardHolder : NCardHolder
    {
    }
}

namespace MegaCrit.Sts2.Core.Nodes.Screens.ScreenContext
{
    public interface IScreenContext
    {
    }
}

namespace MegaCrit.Sts2.Core.Nodes.Screens.Overlays
{
    using Godot;
    using MegaCrit.Sts2.Core.Nodes.Screens.ScreenContext;

    public interface IOverlayScreen : IScreenContext
    {
    }

    public class NOverlayStack : Control
    {
        public static NOverlayStack? Instance => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Nodes.CommonUi
{
    using Godot;
    using MegaCrit.Sts2.Core.Nodes.Screens.ScreenContext;

    public class NModalContainer : Control
    {
        public static NModalContainer? Instance => throw null!;

        public IScreenContext? OpenModal => throw null!;
    }
}
