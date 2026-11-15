using AgentBridge.Protocol;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.DevConsole;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.GodotExtensions;
using MegaCrit.Sts2.Core.Runs;
using GameCreature = MegaCrit.Sts2.Core.Entities.Creatures.Creature;
using GamePlayer = MegaCrit.Sts2.Core.Entities.Players.Player;

namespace AgentBridge.AgentBridgeCode;

internal static class Actions
{
    private static readonly Lazy<DevConsole> Console = new(() => new DevConsole(shouldAllowDebugCommands: true));

    public static ActionResult Perform(BridgeAction action) => action.Tag switch
    {
        Tag.Press => Press(action.Control ?? string.Empty),
        Tag.PlayCard => PlayCard((int)(action.Card ?? -1), action.Target),
        Tag.UsePotion => UsePotion((int)(action.Slot ?? -1), action.Target),
        Tag.EndTurn => EndTurn(),
        Tag.Console => RunConsole(action.Command ?? string.Empty),
        _ => Fail($"unknown action {action.Tag}"),
    };

    private static ActionResult Press(string id)
    {
        Godot.Control? control = Controls.Find(id);
        if (control is null)
        {
            return Fail($"no control at {id}");
        }
        if (!Controls.IsPressable(control))
        {
            return Fail($"{id} is hidden or disabled");
        }
        switch (control)
        {
            case NCardHolder holder:
                holder.EmitSignal(NCardHolder.SignalName.Pressed, holder);
                break;
            case NClickableControl clickable:
                clickable.ForceClick();
                break;
            case BaseButton button:
                button.EmitSignal(BaseButton.SignalName.Pressed);
                break;
            default:
                return Fail($"{id} is not pressable");
        }
        return Ok($"pressed {control.GetType().Name}");
    }

    private static ActionResult PlayCard(int index, long? target)
    {
        if (Me() is not { PlayerCombatState: { } state })
        {
            return Fail("not in combat");
        }
        IReadOnlyList<CardModel> hand = state.Hand.Cards;
        if (index < 0 || index >= hand.Count)
        {
            return Fail($"hand has {hand.Count} cards");
        }
        CardModel card = hand[index];
        if (!card.CanPlay(out UnplayableReason reason, out AbstractModel? _))
        {
            return Fail($"{card.Title} is unplayable: {reason}");
        }
        GameCreature? creature = Target(target);
        return card.TryManualPlay(creature)
            ? Ok($"played {card.Title}")
            : Fail($"{card.Title} cannot target {target?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "nothing"} (needs {card.TargetType})");
    }

    private static ActionResult UsePotion(int slot, long? target)
    {
        if (Me() is not { } me)
        {
            return Fail("not in a run");
        }
        if (slot < 0 || slot >= me.PotionSlots.Count || me.PotionSlots[slot] is not { } potion)
        {
            return Fail($"no potion in slot {slot}");
        }
        potion.EnqueueManualUse(Target(target));
        return Ok($"used {potion.Id.Entry}");
    }

    private static ActionResult EndTurn()
    {
        if (Me() is not { PlayerCombatState: { } state } me || !CombatManager.Instance.IsInProgress)
        {
            return Fail("not in combat");
        }
        if (CombatManager.Instance.IsPlayerReadyToEndTurn(me))
        {
            return Fail("turn already ended");
        }
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(new EndPlayerTurnAction(me, state.TurnNumber));
        return Ok("ended turn");
    }

    private static ActionResult RunConsole(string command)
    {
        CmdResult result = Console.Value.ProcessCommand(command);
        return new ActionResult { Ok = result.success, Message = result.msg };
    }

    private static GamePlayer? Me() => LocalContext.GetMe(RunManager.Instance.DebugOnlyGetState());

    private static GameCreature? Target(long? combatId)
    {
        if (combatId is null || CombatManager.Instance.DebugOnlyGetState() is not { } combat)
        {
            return null;
        }
        return combat.Creatures.FirstOrDefault(creature => creature.CombatId == combatId);
    }

    private static ActionResult Ok(string message) => new() { Ok = true, Message = message };

    private static ActionResult Fail(string message) => new() { Ok = false, Message = message };
}
