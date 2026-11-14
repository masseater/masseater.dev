import { Schema } from "effect";

const Power = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  amount: Schema.Int,
}).annotate({ identifier: "Power" });

const Intent = Schema.Struct({
  type: Schema.String,
  damage: Schema.NullOr(Schema.Int),
  hits: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "Intent" });

const Creature = Schema.Struct({
  combatId: Schema.Int,
  id: Schema.String,
  name: Schema.String,
  hp: Schema.Int,
  maxHp: Schema.Int,
  block: Schema.Int,
  alive: Schema.Boolean,
  powers: Schema.Array(Power),
  intents: Schema.Array(Intent),
}).annotate({ identifier: "Creature" });

const Card = Schema.Struct({
  index: Schema.Int,
  id: Schema.String,
  name: Schema.String,
  cost: Schema.Int,
  costsX: Schema.Boolean,
  upgraded: Schema.Boolean,
  playable: Schema.Boolean,
  unplayableReason: Schema.NullOr(Schema.String),
  target: Schema.String,
  description: Schema.String,
}).annotate({ identifier: "Card" });

const DeckCard = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  upgraded: Schema.Boolean,
}).annotate({ identifier: "DeckCard" });

const Potion = Schema.Struct({
  slot: Schema.Int,
  id: Schema.String,
  name: Schema.String,
  target: Schema.String,
}).annotate({ identifier: "Potion" });

const Relic = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "Relic" });

const Player = Schema.Struct({
  netId: Schema.String,
  me: Schema.Boolean,
  character: Schema.String,
  hp: Schema.Int,
  maxHp: Schema.Int,
  block: Schema.Int,
  gold: Schema.Int,
  maxEnergy: Schema.Int,
  potions: Schema.Array(Potion),
  relics: Schema.Array(Relic),
  deck: Schema.Array(DeckCard),
}).annotate({ identifier: "Player" });

const MapNode = Schema.Struct({
  col: Schema.Int,
  row: Schema.Int,
  type: Schema.String,
}).annotate({ identifier: "MapNode" });

const Run = Schema.Struct({
  act: Schema.Int,
  floor: Schema.Int,
  ascension: Schema.Int,
  room: Schema.String,
  players: Schema.Array(Player),
  mapPosition: Schema.NullOr(MapNode),
  nextNodes: Schema.Array(MapNode),
}).annotate({ identifier: "Run" });

const Combat = Schema.Struct({
  turn: Schema.Int,
  phase: Schema.String,
  energy: Schema.Int,
  stars: Schema.Int,
  hand: Schema.Array(Card),
  drawPile: Schema.Int,
  discardPile: Schema.Int,
  exhaustPile: Schema.Int,
  allies: Schema.Array(Creature),
  enemies: Schema.Array(Creature),
}).annotate({ identifier: "Combat" });

const Control = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  text: Schema.String,
  x: Schema.Int,
  y: Schema.Int,
  width: Schema.Int,
  height: Schema.Int,
}).annotate({ identifier: "Control" });

const Bridge = Schema.Struct({
  version: Schema.String,
  gameVersion: Schema.String,
  clientId: Schema.NullOr(Schema.Int),
  port: Schema.Int,
}).annotate({ identifier: "Bridge" });

const GameState = Schema.Struct({
  bridge: Bridge,
  frame: Schema.Int,
  busy: Schema.Boolean,
  scene: Schema.String,
  overlays: Schema.Array(Schema.String),
  run: Schema.NullOr(Run),
  combat: Schema.NullOr(Combat),
  controls: Schema.Array(Control),
}).annotate({ identifier: "GameState" });

const Action = Schema.Union([
  Schema.TaggedStruct("press", { control: Schema.String }),
  Schema.TaggedStruct("play_card", { card: Schema.Int, target: Schema.NullOr(Schema.Int) }),
  Schema.TaggedStruct("use_potion", { slot: Schema.Int, target: Schema.NullOr(Schema.Int) }),
  Schema.TaggedStruct("end_turn", {}),
  Schema.TaggedStruct("console", { command: Schema.String }),
]).annotate({ identifier: "BridgeAction" });

const ActionResult = Schema.Struct({
  ok: Schema.Boolean,
  message: Schema.String,
}).annotate({ identifier: "ActionResult" });

type ActionType = typeof Action.Type;

type ActionResultType = typeof ActionResult.Type;

type GameStateType = typeof GameState.Type;

export {
  Action,
  ActionResult,
  Bridge,
  Card,
  Combat,
  Control,
  Creature,
  DeckCard,
  GameState,
  Intent,
  MapNode,
  Player,
  Potion,
  Power,
  Relic,
  Run,
};

export type { ActionResultType, ActionType, GameStateType };
