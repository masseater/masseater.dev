import { Schema } from "effect";

export const Power = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  amount: Schema.Int,
}).annotate({ identifier: "Power" });

export const Intent = Schema.Struct({
  type: Schema.String,
  damage: Schema.NullOr(Schema.Int),
  hits: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "Intent" });

export const Creature = Schema.Struct({
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

export const Card = Schema.Struct({
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

export const DeckCard = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  upgraded: Schema.Boolean,
}).annotate({ identifier: "DeckCard" });

export const Potion = Schema.Struct({
  slot: Schema.Int,
  id: Schema.String,
  name: Schema.String,
  target: Schema.String,
}).annotate({ identifier: "Potion" });

export const Relic = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
}).annotate({ identifier: "Relic" });

export const Player = Schema.Struct({
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

export const MapNode = Schema.Struct({
  col: Schema.Int,
  row: Schema.Int,
  type: Schema.String,
}).annotate({ identifier: "MapNode" });

export const Run = Schema.Struct({
  act: Schema.Int,
  floor: Schema.Int,
  ascension: Schema.Int,
  room: Schema.String,
  players: Schema.Array(Player),
  mapPosition: Schema.NullOr(MapNode),
  nextNodes: Schema.Array(MapNode),
}).annotate({ identifier: "Run" });

export const Combat = Schema.Struct({
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

export const Control = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  text: Schema.String,
  x: Schema.Int,
  y: Schema.Int,
  width: Schema.Int,
  height: Schema.Int,
}).annotate({ identifier: "Control" });

export const Bridge = Schema.Struct({
  version: Schema.String,
  gameVersion: Schema.String,
  clientId: Schema.NullOr(Schema.Int),
  port: Schema.Int,
}).annotate({ identifier: "Bridge" });

export const GameState = Schema.Struct({
  bridge: Bridge,
  frame: Schema.Int,
  busy: Schema.Boolean,
  scene: Schema.String,
  overlays: Schema.Array(Schema.String),
  run: Schema.NullOr(Run),
  combat: Schema.NullOr(Combat),
  controls: Schema.Array(Control),
}).annotate({ identifier: "GameState" });

export const Action = Schema.Union([
  Schema.TaggedStruct("press", { control: Schema.String }),
  Schema.TaggedStruct("play_card", { card: Schema.Int, target: Schema.NullOr(Schema.Int) }),
  Schema.TaggedStruct("use_potion", { slot: Schema.Int, target: Schema.NullOr(Schema.Int) }),
  Schema.TaggedStruct("end_turn", {}),
  Schema.TaggedStruct("console", { command: Schema.String }),
]).annotate({ identifier: "BridgeAction" });

export const ActionResult = Schema.Struct({
  ok: Schema.Boolean,
  message: Schema.String,
}).annotate({ identifier: "ActionResult" });

export type ActionType = typeof Action.Type;

export type ActionResultType = typeof ActionResult.Type;

export type GameStateType = typeof GameState.Type;
