import { PermissionFlagsBits } from "discord-api-types/v10";
import { BigInt as BigInteger } from "effect";

const ZONE = "masseater.dev";
const BASE_PATH = "/three-twelve";

const PLAY_AT = { hour: 18, minute: 12 } as const;
const ARM_LEAD = { minutes: 1 } as const;
const CRON = `${PLAY_AT.minute - ARM_LEAD.minutes} ${PLAY_AT.hour} * * *`;

const PLAYER_IMAGE = "PlayerImage";
const PLAYER_ENTRYPOINT = ["node", "/app/player.mjs"] as const;
const AUDIO_KEY = "3ji12fun.ogg";

const OWNER_DISCORD_ID = "687942167217307658";

const INVITE_PERMISSIONS = String(
  BigInteger.sumAll([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ]),
);

export {
  ARM_LEAD,
  AUDIO_KEY,
  BASE_PATH,
  CRON,
  INVITE_PERMISSIONS,
  OWNER_DISCORD_ID,
  PLAYER_ENTRYPOINT,
  PLAYER_IMAGE,
  PLAY_AT,
  ZONE,
};
