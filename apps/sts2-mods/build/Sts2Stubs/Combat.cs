namespace MegaCrit.Sts2.Core.Entities.Cards
{
    using MegaCrit.Sts2.Core.Models;

    public enum UnplayableReason
    {
        None = 0,
        HasUnplayableKeyword = 2,
        BlockedByHook = 4,
        BlockedByCardLogic = 8,
        EnergyCostTooHigh = 0x10,
        StarCostTooHigh = 0x20,
        NoLivingAllies = 0x40,
    }

    public enum TargetType
    {
        None,
        Self,
        AnyEnemy,
        AllEnemies,
        RandomEnemy,
        AnyPlayer,
        AnyAlly,
        AllAllies,
        TargetedNoCreature,
        Osty,
    }

    public enum PileType
    {
        None,
        Draw,
        Hand,
        Discard,
        Exhaust,
        Play,
        Deck,
    }

    public sealed class CardEnergyCost
    {
        public bool CostsX => throw null!;

        public int GetResolved() => throw null!;
    }

    public class CardPile
    {
        public IReadOnlyList<CardModel> Cards => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Entities.Creatures
{
    using MegaCrit.Sts2.Core.Combat;
    using MegaCrit.Sts2.Core.Entities.Players;
    using MegaCrit.Sts2.Core.Models;

    public class Creature
    {
        public uint? CombatId => throw null!;

        public MonsterModel? Monster => throw null!;

        public Player? Player => throw null!;

        public ICombatState? CombatState => throw null!;

        public string Name => throw null!;

        public int CurrentHp => throw null!;

        public int MaxHp => throw null!;

        public int Block => throw null!;

        public bool IsAlive => throw null!;

        public IReadOnlyList<PowerModel> Powers => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Combat
{
    using MegaCrit.Sts2.Core.Entities.Creatures;
    using MegaCrit.Sts2.Core.Entities.Players;

    public enum PlayerTurnPhase
    {
        None,
        Start,
        AutoPrePlay,
        Play,
        AutoPostPlay,
        End,
    }

    public interface ICombatState
    {
        IReadOnlyList<Creature> Allies { get; }

        IReadOnlyList<Creature> Enemies { get; }

        IReadOnlyList<Creature> Creatures { get; }

        IReadOnlyList<Creature> GetOpponentsOf(Creature creature);
    }

    public class CombatState : ICombatState
    {
        public IReadOnlyList<Creature> Allies => throw null!;

        public IReadOnlyList<Creature> Enemies => throw null!;

        public IReadOnlyList<Creature> Creatures => throw null!;

        public IReadOnlyList<Creature> GetOpponentsOf(Creature creature) => throw null!;
    }

    public class CombatManager
    {
        public static CombatManager Instance => throw null!;

        public bool IsInProgress => throw null!;

        public CombatState? DebugOnlyGetState() => throw null!;

        public bool IsPlayerReadyToEndTurn(Player player) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.MonsterMoves.Intents
{
    using MegaCrit.Sts2.Core.Entities.Creatures;

    public enum IntentType
    {
        Attack,
        Buff,
        Debuff,
        DebuffStrong,
        Defend,
        Escape,
        Heal,
        Hidden,
        Summon,
        Sleep,
        Stun,
        StatusCard,
        CardDebuff,
        DeathBlow,
        Unknown,
    }

    public abstract class AbstractIntent
    {
        public abstract IntentType IntentType { get; }
    }

    public abstract class AttackIntent : AbstractIntent
    {
        public virtual int Repeats => throw null!;

        public int GetSingleDamage(IEnumerable<Creature> targets, Creature owner) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.MonsterMoves.MonsterMoveStateMachine
{
    using MegaCrit.Sts2.Core.MonsterMoves.Intents;

    public class MoveState
    {
        public IReadOnlyList<AbstractIntent> Intents => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Rooms
{
    public enum RoomType
    {
        Unassigned,
        Monster,
        Elite,
        Boss,
        Treasure,
        Shop,
        Event,
        RestSite,
        Map,
    }

    public abstract class AbstractRoom
    {
        public abstract RoomType RoomType { get; }
    }
}

namespace MegaCrit.Sts2.Core.GameActions
{
    using MegaCrit.Sts2.Core.Entities.Players;

    public abstract class GameAction
    {
    }

    public class EndPlayerTurnAction : GameAction
    {
        public EndPlayerTurnAction(Player player, int turnNumber) => throw null!;
    }

    public class ActionExecutor
    {
        public bool IsRunning => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.GameActions.Multiplayer
{
    using MegaCrit.Sts2.Core.GameActions;

    public class ActionQueueSet
    {
        public bool IsEmpty => throw null!;
    }

    public class ActionQueueSynchronizer
    {
        public void RequestEnqueue(GameAction action) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.DevConsole
{
    using System.Threading.Tasks;

    public struct CmdResult
    {
        public readonly bool success;

        public readonly string msg;

        public readonly Task? task;
    }

    public class DevConsole
    {
        public DevConsole(bool shouldAllowDebugCommands) => throw null!;

        public CmdResult ProcessCommand(string inputValue) => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Debug
{
    public class ReleaseInfo
    {
        public required string Version { get; init; }
    }

    public class ReleaseInfoManager
    {
        public static ReleaseInfoManager Instance => throw null!;

        public ReleaseInfo? ReleaseInfo => throw null!;
    }
}

namespace MegaCrit.Sts2.Core.Helpers
{
    public static class CommandLineHelper
    {
        public static bool HasArg(string key) => throw null!;

        public static bool TryGetValue(string key, out string? value) => throw null!;
    }
}
