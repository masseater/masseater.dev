using Godot;

namespace Sts2Mods.Common;

/// <summary>全 Mod 共通のキーボードショートカット判定。</summary>
public static class Shortcuts
{
    /// <summary>
    /// Ctrl+Z (Mac は Cmd+Z も) が押された瞬間なら true。Shift 付き (やり直し) とキーリピートは除く。
    /// </summary>
    public static bool IsUndo(InputEvent inputEvent)
    {
        if (inputEvent is not InputEventKey { Pressed: true, Echo: false } key)
        {
            return false;
        }

        if (key.Keycode != Key.Z && key.PhysicalKeycode != Key.Z)
        {
            return false;
        }

        if (key.ShiftPressed || key.AltPressed)
        {
            return false;
        }

        // Mac では Cmd (Meta) と Ctrl のどちらでも受け付ける (IsCommandOrControlPressed は Mac だと Cmd だけを見る)
        return key.CtrlPressed || key.MetaPressed;
    }
}
