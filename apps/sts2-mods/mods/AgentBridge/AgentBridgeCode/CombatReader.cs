using System.Text.RegularExpressions;
using AgentBridge.Protocol;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.MonsterMoves.Intents;
using GameCreature = MegaCrit.Sts2.Core.Entities.Creatures.Creature;
using GamePlayer = MegaCrit.Sts2.Core.Entities.Players.Player;

namespace AgentBridge.AgentBridgeCode;

/// <summary>戦闘中の手札・山・敵味方を読む。</summary>
internal static partial class CombatReader
{
    public static Combat? Read(CombatState combat, GamePlayer? me)
    {
        if (me?.PlayerCombatState is not { } state)
        {
            return null;
        }
        return new Combat
        {
            Turn = state.TurnNumber,
            Phase = state.Phase.ToString(),
            Energy = state.Energy,
            Stars = state.Stars,
            Hand = [.. state.Hand.Cards.Select(ReadCard)],
            DrawPile = state.DrawPile.Cards.Count,
            DiscardPile = state.DiscardPile.Cards.Count,
            ExhaustPile = state.ExhaustPile.Cards.Count,
            Allies = [.. combat.Allies.Select(ReadCreature)],
            Enemies = [.. combat.Enemies.Select(ReadCreature)],
        };
    }

    private static Card ReadCard(CardModel card, int index)
    {
        bool playable = card.CanPlay(out UnplayableReason reason, out AbstractModel? _);
        return new Card
        {
            Index = index,
            Id = card.Id.Entry,
            Name = card.Title,
            Cost = card.EnergyCost.GetResolved(),
            CostsX = card.EnergyCost.CostsX,
            Upgraded = card.IsUpgraded,
            Playable = playable,
            UnplayableReason = playable ? null : reason.ToString(),
            Target = card.TargetType.ToString(),
            Description = Plain(card.GetDescriptionForPile(PileType.Hand)),
        };
    }

    private static Creature ReadCreature(GameCreature creature) => new()
    {
        CombatId = creature.CombatId ?? 0,
        Id = creature.Monster?.Id.Entry ?? creature.Player?.Character.Id.Entry ?? "unknown",
        Name = creature.Name,
        Hp = creature.CurrentHp,
        MaxHp = creature.MaxHp,
        Block = creature.Block,
        Alive = creature.IsAlive,
        Powers = [.. creature.Powers.Select(power => new Power { Id = power.Id.Entry, Name = Text.Of(power.Title), Amount = power.DisplayAmount })],
        Intents = creature.Monster is { } monster ? [.. monster.NextMove.Intents.Select(intent => ReadIntent(intent, creature))] : [],
    };

    private static Intent ReadIntent(AbstractIntent intent, GameCreature owner)
    {
        if (intent is AttackIntent attack && owner.CombatState is { } combat)
        {
            IReadOnlyList<GameCreature> targets = combat.GetOpponentsOf(owner);
            return new Intent
            {
                Type = intent.IntentType.ToString(),
                Damage = attack.GetSingleDamage(targets, owner),
                Hits = Math.Max(1, attack.Repeats),
            };
        }
        return new Intent { Type = intent.IntentType.ToString(), Damage = null, Hits = null };
    }

    private static string Plain(string richText) => RichTextTag().Replace(richText, string.Empty);

    [GeneratedRegex(@"\[[^\]]*\]", RegexOptions.None, matchTimeoutMilliseconds: 1000)]
    private static partial Regex RichTextTag();
}
