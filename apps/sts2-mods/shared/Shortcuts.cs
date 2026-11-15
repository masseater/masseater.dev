using Godot;

namespace Sts2Mods.Common;

public static class Shortcuts
{
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

        return key.CtrlPressed || key.MetaPressed;
    }
}
