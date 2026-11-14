using Godot;

namespace AgentBridge.AgentBridgeCode;

/// <summary>このインスタンスのウィンドウに描かれた画面を PNG にする。</summary>
internal static class Screenshot
{
    public static byte[] Capture()
    {
        var tree = (SceneTree)Engine.GetMainLoop();
        using Image image = tree.Root.GetTexture().GetImage();
        return image.SavePngToBuffer();
    }
}
