using MegaCrit.Sts2.Core.Localization;

namespace AgentBridge.AgentBridgeCode;

internal static class Text
{
    public static string Of(LocString text)
    {
        try
        {
            return text.GetFormattedText();
        }
        catch (Exception exception) when (exception is KeyNotFoundException or InvalidOperationException or FormatException)
        {
            return text.LocEntryKey;
        }
    }
}
