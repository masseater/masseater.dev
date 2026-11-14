using MegaCrit.Sts2.Core.Localization;

namespace AgentBridge.AgentBridgeCode;

/// <summary>ゲームのローカライズ文字列を、失敗しても落とさずに読む。</summary>
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
