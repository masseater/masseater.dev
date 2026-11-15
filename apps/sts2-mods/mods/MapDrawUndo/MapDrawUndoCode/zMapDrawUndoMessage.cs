using System.Diagnostics.CodeAnalysis;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using MegaCrit.Sts2.Core.Multiplayer.Transport;

namespace MapDrawUndo.MapDrawUndoCode;

[SuppressMessage("Style", "IDE1006:Naming Styles", Justification = "メッセージ ID を末尾に置くため型名は z で始める必要がある")]
public sealed class zMapDrawUndoMessage : INetMessage
{
    public bool ShouldBroadcast => true;

    public NetTransferMode Mode => NetTransferMode.Reliable;

    public LogLevel LogLevel => LogLevel.Debug;

    public bool ShouldBuffer => false;

    public void Serialize(PacketWriter writer)
    {
    }

    public void Deserialize(PacketReader reader)
    {
    }
}
