// sts2.dll の型の形だけを写したスタブ。Sts2Stubs.csproj の説明を参照。
// 各型の出典は公開デコンパイルの decompiled/<名前空間>/<型名>.cs

namespace MegaCrit.Sts2.Core.Modding
{
    [AttributeUsage(AttributeTargets.Class, Inherited = false)]
    public class ModInitializerAttribute : Attribute
    {
        public string initializerMethod;

        public ModInitializerAttribute(string initializerMethod) => this.initializerMethod = initializerMethod;
    }
}

namespace MegaCrit.Sts2.Core.Logging
{
    public enum LogType
    {
        Generic,
        Network,
        Actions,
        GameSync,
        VisualSync,
    }

    public enum LogLevel
    {
        VeryDebug,
        Load,
        Debug,
        Info,
        Warn,
        Error,
    }

    public class Logger
    {
        public Logger(string? context, LogType logType) => throw null!;

        public void Debug(string text, int skipFrames = 1) => throw null!;

        public void Info(string text, int skipFrames = 1) => throw null!;

        public void Warn(string text, int skipFrames = 1) => throw null!;

        public void Error(string text, int skipFrames = 1) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Localization
{
    public class LocString
    {
        public LocString(string locTable, string locEntryKey) => throw null!;

        public string GetFormattedText() => throw null!;

        public string GetRawText() => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Platform
{
    public enum PlatformType
    {
        None,
        Steam,
    }

    public static class PlatformUtil
    {
        public static string GetPlayerName(PlatformType platformType, ulong playerId) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Map
{
    public struct MapCoord : IEquatable<MapCoord>
    {
        public int col;

        public int row;

        public MapCoord(int col, int row) => throw null!;

        public readonly bool Equals(MapCoord other) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Models
{
    using Godot;
    using MegaCrit.Sts2.Core.Localization;

    public abstract class AbstractModel
    {
    }

    public abstract class CardModel : AbstractModel
    {
        // 強化済みなら "+" 付きの表示名
        public string Title => throw null!;
    }

    public abstract class RelicModel : AbstractModel
    {
        public virtual LocString Title => throw null!;
    }

    public abstract class PotionModel : AbstractModel
    {
        public LocString Title => throw null!;
    }

    public abstract class CharacterModel : AbstractModel
    {
        public LocString Title => throw null!;

        public abstract Color NameColor { get; }

        public virtual Color MapDrawingColor => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Entities.Players
{
    using MegaCrit.Sts2.Core.Models;

    public class Player
    {
        public CharacterModel Character => throw null!;

        public ulong NetId => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Entities.Multiplayer
{
    public enum NetScreenType
    {
        None,
        Room,
        Map,
        Settings,
        Compendium,
        DeckView,
        CardPile,
        SimpleCardsView,
        CardSelection,
        GameOver,
        PauseMenu,
        Rewards,
        Feedback,
        SharedRelicPicking,
        RemotePlayerExpandedState,
    }
}

namespace MegaCrit.Sts2.Core.Context
{
    using MegaCrit.Sts2.Core.Entities.Players;
    using MegaCrit.Sts2.Core.Runs;

    public static class LocalContext
    {
        public static ulong? NetId { get; set; }

        public static Player? GetMe(IPlayerCollection? playerCollection) => throw null!;

        public static bool IsMe(Player? player) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Runs
{
    using MegaCrit.Sts2.Core.Entities.Players;
    using MegaCrit.Sts2.Core.Multiplayer.Game;
    using MegaCrit.Sts2.Core.Multiplayer.Game.PeerInput;

    public interface IPlayerCollection
    {
        IReadOnlyList<Player> Players { get; }

        int GetPlayerSlotIndex(Player player);

        Player? GetPlayer(ulong netId);
    }

    public class RunState : IPlayerCollection
    {
        public IReadOnlyList<Player> Players => throw null!;

        public int GetPlayerSlotIndex(Player player) => throw null!;

        public Player? GetPlayer(ulong netId) => throw null!;
    }

    public class RunManager
    {
        public static RunManager Instance => throw null!;

        public bool IsInProgress => throw null!;

        public INetGameService NetService => throw null!;

        public MapSelectionSynchronizer MapSelectionSynchronizer => throw null!;

        public PeerInputSynchronizer InputSynchronizer => throw null!;

        public HoveredModelTracker HoveredModelTracker => throw null!;
    }
}
