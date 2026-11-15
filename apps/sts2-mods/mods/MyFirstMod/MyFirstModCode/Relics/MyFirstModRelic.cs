using BaseLib.Abstracts;
using BaseLib.Extensions;
using MyFirstMod.MyFirstModCode.Extensions;

namespace MyFirstMod.MyFirstModCode.Relics;

public abstract class MyFirstModRelic : CustomRelicModel
{
    public override string PackedIconPath => $"{Id.Entry.RemovePrefix().ToLowerInvariant()}.png".RelicImagePath();
    protected override string PackedIconOutlinePath => $"{Id.Entry.RemovePrefix().ToLowerInvariant()}_outline.png".RelicImagePath();
    protected override string BigIconPath => $"{Id.Entry.RemovePrefix().ToLowerInvariant()}.png".BigRelicImagePath();
}
