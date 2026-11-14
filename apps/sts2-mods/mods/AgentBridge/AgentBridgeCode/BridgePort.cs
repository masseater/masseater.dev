using System.Globalization;
using AgentBridge.Protocol;
using MegaCrit.Sts2.Core.Helpers;

namespace AgentBridge.AgentBridgeCode;

/// <summary>
/// インスタンスごとの待ち受けポート。1 台目 (Steam 経由・--fastmp=host) は基準のポート、
/// --fastmp=join --clientId=N の参加側は基準 + N - <see cref="Ports.JoinClientIdBase"/> を使う。
/// </summary>
internal static class BridgePort
{
    public static int? ClientId { get; private set; }

    public static int Resolve()
    {
        if (CommandLineHelper.TryGetValue("clientId", out string? value)
            && int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int clientId))
        {
            ClientId = clientId;
            return Ports.Base + clientId - Ports.JoinClientIdBase;
        }
        return Ports.Base;
    }
}
