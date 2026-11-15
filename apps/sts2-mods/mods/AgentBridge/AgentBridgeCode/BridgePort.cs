using System.Globalization;
using AgentBridge.Protocol;
using MegaCrit.Sts2.Core.Helpers;

namespace AgentBridge.AgentBridgeCode;

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
