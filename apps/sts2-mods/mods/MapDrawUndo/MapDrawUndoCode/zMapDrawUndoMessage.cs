using System.Diagnostics.CodeAnalysis;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Multiplayer.Serialization;
using MegaCrit.Sts2.Core.Multiplayer.Transport;

namespace MapDrawUndo.MapDrawUndoCode;

/// <summary>
/// 「自分の最後の線を 1 本取り消した」ことを他のプレイヤーに伝えるメッセージ。中身は無い。
/// </summary>
/// <remarks>
/// ゲームは INetMessage を実装した型を Mod の分も含めて型名の順に並べ、その順番をメッセージ ID にしている
/// (MegaCrit.Sts2.Core.Multiplayer.Serialization.MessageTypes / NetTypeCache)。
/// 型名を z で始めて並びの最後に置き、この Mod を入れていない相手とバニラのメッセージ ID がずれないようにしている。
/// </remarks>
[SuppressMessage("Style", "IDE1006:Naming Styles", Justification = "メッセージ ID を末尾に置くため型名は z で始める必要がある")]
public sealed class zMapDrawUndoMessage : INetMessage
{
    /// <inheritdoc />
    public bool ShouldBroadcast => true;

    /// <inheritdoc />
    public NetTransferMode Mode => NetTransferMode.Reliable;

    /// <inheritdoc />
    public LogLevel LogLevel => LogLevel.Debug;

    /// <summary>ゲームの新しい版 (v0.106 以降) の INetMessage にあるメンバー。古い版では使われない。</summary>
    public bool ShouldBuffer => false;

    /// <inheritdoc />
    public void Serialize(PacketWriter writer)
    {
    }

    /// <inheritdoc />
    public void Deserialize(PacketReader reader)
    {
    }
}
