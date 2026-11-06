import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import type { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { NodeRuntime, NodeServices, NodeStream } from "@effect/platform-node";
import { ChannelType, Client, Events, GatewayIntentBits } from "discord.js";
import type { Guild } from "discord.js";
import {
  Array as Arr,
  Clock,
  Config,
  Context,
  Duration,
  Effect,
  Fiber,
  Layer,
  Logger,
  Option,
  Redacted,
  Schema,
  Stdio,
  Stream,
  pipe,
} from "effect";

import { Outcomes } from "#outcome";

import { discordFailed } from "./discord-failed.ts";
import type { DiscordFailed } from "./discord-failed.ts";
import { pickRoom } from "./voice-room.ts";
import type { VoiceRoom } from "./voice-room.ts";

const CONNECT_TIMEOUT = Duration.toMillis("30 seconds");
const START_TIMEOUT = Duration.toMillis("10 seconds");
const SONG_TIMEOUT = Duration.toMillis("15 minutes");

type Outcome = (typeof Outcomes.Type)[number];
class Song extends Context.Service<Song, Stream.Stream<Uint8Array>>()(
  "three-twelve/player/main/Song",
) {}

const awaitReady = (client: Client): Effect.Effect<true> =>
  Effect.callback<true>((resume) => {
    client.once(Events.ClientReady, () => {
      resume(Effect.succeed(true));
    });
  });

const login = Effect.fn("player.login")(function* login(token: Redacted.Redacted) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });
  const ready = yield* Effect.forkChild(awaitReady(client));
  yield* Effect.tryPromise({
    try: () => client.login(Redacted.value(token)),
    catch: discordFailed,
  });
  yield* Fiber.join(ready);
  return client;
});

const rooms = (guild: Guild): readonly VoiceRoom[] =>
  pipe(
    [...guild.channels.cache.values()],
    Arr.filter((channel) => channel.type === ChannelType.GuildVoice),
    Arr.map((channel) => ({
      id: channel.id,
      name: channel.name,
      listeners: channel.members.filter((member) => !member.user.bot).size,
      joinable: channel.joinable && channel.speakable,
      afk: channel.id === guild.afkChannelId,
    })),
  );

const connect = (guild: Guild, room: VoiceRoom): Effect.Effect<VoiceConnection, DiscordFailed> => {
  const connection = joinVoiceChannel({
    channelId: room.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
  });
  return Effect.tryPromise({
    try: () => entersState(connection, VoiceConnectionStatus.Ready, CONNECT_TIMEOUT),
    catch: discordFailed,
  });
};

const untilStatus = (
  player: AudioPlayer,
  status: AudioPlayerStatus,
  timeout: number,
): Effect.Effect<void, DiscordFailed> =>
  Effect.tryPromise({ try: () => entersState(player, status, timeout), catch: discordFailed });

const playSong = Effect.fn("player.playSong")(function* playSong(connection: VoiceConnection) {
  const song = yield* Song;
  const player = createAudioPlayer();
  connection.subscribe(player);
  const source = yield* NodeStream.toReadable(song);
  player.play(createAudioResource(source, { inputType: StreamType.OggOpus }));
  yield* untilStatus(player, AudioPlayerStatus.Playing, START_TIMEOUT);
  yield* untilStatus(player, AudioPlayerStatus.Idle, SONG_TIMEOUT);
});

const playIn = Effect.fn("player.playIn")(function* playIn(guild: Guild, room: VoiceRoom) {
  const where = { guildId: guild.id, guildName: guild.name, channelName: room.name };
  return yield* Effect.acquireUseRelease(
    connect(guild, room),
    (connection) => playSong(connection),
    (connection) =>
      Effect.sync(() => {
        connection.destroy();
      }),
  ).pipe(
    Effect.as<Outcome>({ status: "played", ...where, listeners: room.listeners }),
    Effect.catchTag("DiscordFailed", (error) =>
      Effect.succeed<Outcome>({ status: "failed", ...where, reason: error.message }),
    ),
  );
});

const visit = (guild: Guild): Effect.Effect<Outcome, never, Song> =>
  Option.match(pickRoom(rooms(guild)), {
    onNone: () =>
      Effect.succeed<Outcome>({ status: "empty", guildId: guild.id, guildName: guild.name }),
    onSome: (room) => playIn(guild, room),
  });

const waitUntil = Effect.fn("player.waitUntil")(function* waitUntil(startAt: number) {
  const now = yield* Clock.currentTimeMillis;
  yield* Effect.sleep(Duration.max(Duration.zero, Duration.millis(startAt - now)));
});

const visitAll = Effect.fn("player.visitAll")(function* visitAll(client: Client, startAt: number) {
  const guilds = [...client.guilds.cache.values()];
  yield* waitUntil(startAt);
  return yield* Effect.forEach(guilds, visit, { concurrency: "unbounded" });
});

const play = Effect.fn("player.play")(function* play() {
  const token = yield* Config.Redacted("DISCORD_BOT_TOKEN");
  const startAt = yield* Config.Number("START_AT");
  const stdio = yield* Stdio.Stdio;
  const chunks = yield* Stream.runCollect(stdio.stdin);
  const outcomes = yield* Effect.acquireUseRelease(
    login(token),
    (client) => visitAll(client, startAt),
    (client) => Effect.promise(() => client.destroy()),
  ).pipe(Effect.provideService(Song, Stream.fromIterable(chunks)));
  const encoded = yield* Schema.encodeEffect(Schema.fromJsonString(Outcomes))(outcomes);
  yield* Stream.make(encoded).pipe(Stream.run(stdio.stdout()));
});

const services = Layer.mergeAll(
  NodeServices.layer,
  Logger.layer([Logger.withConsoleError(Logger.formatJson)]),
);

NodeRuntime.runMain(
  Layer.build(services).pipe(
    Effect.flatMap((context) => Effect.provideContext(play(), context)),
    Effect.scoped,
  ),
);
