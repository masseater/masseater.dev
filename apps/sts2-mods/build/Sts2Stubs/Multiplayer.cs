// sts2.dll のマルチプレイ関連の型のスタブ。Sts2Stubs.csproj の説明を参照。

namespace MegaCrit.Sts2.Core.Multiplayer.Transport
{
    public enum NetTransferMode
    {
        None,
        Unreliable,
        Reliable,
    }
}

namespace MegaCrit.Sts2.Core.Multiplayer.Serialization
{
    using MegaCrit.Sts2.Core.Logging;
    using MegaCrit.Sts2.Core.Multiplayer.Transport;

    public interface IPacketSerializable
    {
        void Serialize(PacketWriter writer);

        void Deserialize(PacketReader reader);
    }

    // 公開デコンパイルの版には ShouldBuffer が無いが、v0.106 以降向けの公開 Mod (STS2_oekaki_patch) は実装している。
    // 新しい版に合わせてスタブにも入れておく (古い版では Mod 側の余分なプロパティになるだけで害は無い)
    public interface INetMessage : IPacketSerializable
    {
        bool ShouldBroadcast { get; }

        NetTransferMode Mode { get; }

        LogLevel LogLevel { get; }

        bool ShouldBuffer { get; }
    }

    public class PacketWriter
    {
        public void WriteBool(bool val) => throw null!;

        public void WriteInt(int val, int bits = 32) => throw null!;

        public void WriteULong(ulong val, int bits = 64) => throw null!;
    }

    public class PacketReader
    {
        public bool ReadBool() => throw null!;

        public int ReadInt(int bits = 32) => throw null!;

        public ulong ReadULong(int bits = 64) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Multiplayer.Game
{
    using MegaCrit.Sts2.Core.Entities.Players;
    using MegaCrit.Sts2.Core.Map;
    using MegaCrit.Sts2.Core.Multiplayer.Serialization;
    using MegaCrit.Sts2.Core.Platform;

    public delegate void MessageHandlerDelegate<in T>(T message, ulong senderId)
        where T : INetMessage;

    public enum NetGameType
    {
        None,
        Singleplayer,
        Host,
        Client,
        Replay,
    }

    public interface INetGameService
    {
        ulong NetId { get; }

        bool IsConnected { get; }

        NetGameType Type { get; }

        PlatformType Platform { get; }

        void SendMessage<T>(T message, ulong playerId)
            where T : INetMessage;

        void SendMessage<T>(T message)
            where T : INetMessage;

        void RegisterMessageHandler<T>(MessageHandlerDelegate<T> messageHandlerDelegate)
            where T : INetMessage;

        void UnregisterMessageHandler<T>(MessageHandlerDelegate<T> messageHandlerDelegate)
            where T : INetMessage;
    }

    public struct MapVote
    {
        public int mapGenerationCount;

        public MapCoord coord;
    }

    public class MapSelectionSynchronizer
    {
        public event Action<Player, MapVote?, MapVote?>? PlayerVoteChanged;

        public event Action<Player>? PlayerVoteCancelled;

        public event Action? PlayerVotesCleared;

        public MapVote? GetVote(Player player) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Multiplayer.Game.PeerInput
{
    using MegaCrit.Sts2.Core.Entities.Multiplayer;
    using MegaCrit.Sts2.Core.Models;

    public class PeerInputSynchronizer
    {
        public event Action<ulong>? StateAdded;

        public event Action<ulong>? StateRemoved;

        public event Action<ulong>? StateChanged;

        public event Action<ulong, NetScreenType>? ScreenChanged;

        // 状態が無いプレイヤーを渡すと InvalidOperationException
        public NetScreenType GetScreenType(ulong playerId) => throw null!;

        public bool GetIsTargeting(ulong playerId) => throw null!;
    }

    public class HoveredModelTracker
    {
        public event Action<ulong>? HoverChanged;

        public AbstractModel? GetHoveredModel(ulong playerId) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Multiplayer.Messages.Game.Flavor
{
    using MegaCrit.Sts2.Core.Logging;
    using MegaCrit.Sts2.Core.Multiplayer.Serialization;
    using MegaCrit.Sts2.Core.Multiplayer.Transport;

    public class MapDrawingMessage : INetMessage
    {
        public bool ShouldBroadcast => throw null!;

        public NetTransferMode Mode => throw null!;

        public LogLevel LogLevel => throw null!;

        public bool ShouldBuffer => throw null!;

        public void Serialize(PacketWriter writer) => throw null!;

        public void Deserialize(PacketReader reader) => throw null!;
    }
}
