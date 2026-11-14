using AgentBridge.Protocol;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Map;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Runs;
using GamePlayer = MegaCrit.Sts2.Core.Entities.Players.Player;

namespace AgentBridge.AgentBridgeCode;

/// <summary>ラン全体 (階・プレイヤー・マップ) を読む。</summary>
internal static class RunReader
{
    public static Run Read(RunState run)
    {
        MapPoint? position = run.CurrentMapPoint;
        return new Run
        {
            Act = run.CurrentActIndex + 1,
            Floor = run.ActFloor,
            Ascension = run.AscensionLevel,
            Room = run.CurrentRoom?.RoomType.ToString() ?? "None",
            Players = [.. run.Players.Select(ReadPlayer)],
            MapPosition = position is null ? null : Node(position),
            NextNodes = [.. NextPoints(run).OrderBy(point => point.coord.col).Select(Node)],
        };
    }

    /// <summary>NMapScreen.RecalculateTravelability と同じ順で、次に進めるマップの点を求める。</summary>
    private static IEnumerable<MapPoint> NextPoints(RunState run)
    {
        ActMap map = run.Map;
        if (run.VisitedMapCoords.Count == 0)
        {
            return [map.StartingMapPoint];
        }
        MapCoord last = run.VisitedMapCoords[^1];
        if (map.SecondBossMapPoint is { } secondBoss && last == map.BossMapPoint.coord)
        {
            return [secondBoss];
        }
        if (last.row == map.GetRowCount() - 1)
        {
            return [map.BossMapPoint];
        }
        return map.GetPoint(last) is { } point ? MapTravel.GetTravelablePointsFrom(run, point) : [];
    }

    private static MapNode Node(MapPoint point) => new()
    {
        Col = point.coord.col,
        Row = point.coord.row,
        Type = point.PointType.ToString(),
    };

    private static Player ReadPlayer(GamePlayer player) => new()
    {
        NetId = player.NetId.ToString(System.Globalization.CultureInfo.InvariantCulture),
        Me = LocalContext.IsMe(player),
        Character = player.Character.Id.Entry,
        Hp = player.Creature.CurrentHp,
        MaxHp = player.Creature.MaxHp,
        Block = player.Creature.Block,
        Gold = player.Gold,
        MaxEnergy = player.MaxEnergy,
        Potions = [.. player.PotionSlots.Select((potion, slot) => (potion, slot)).Where(entry => entry.potion is not null).Select(entry => ReadPotion(entry.potion!, entry.slot))],
        Relics = [.. player.Relics.Select(relic => new Relic { Id = relic.Id.Entry, Name = Text.Of(relic.Title) })],
        Deck = [.. player.Deck.Cards.Select(card => new DeckCard { Id = card.Id.Entry, Name = card.Title, Upgraded = card.IsUpgraded })],
    };

    private static Potion ReadPotion(PotionModel potion, int slot) => new()
    {
        Slot = slot,
        Id = potion.Id.Entry,
        Name = Text.Of(potion.Title),
        Target = potion.TargetType.ToString(),
    };
}
