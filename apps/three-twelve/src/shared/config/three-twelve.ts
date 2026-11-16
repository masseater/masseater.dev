import { PermissionFlagsBits } from "discord-api-types/v10";
import { BigInt as BigInteger } from "effect";

export const ZONE = "masseater.dev";
export const BASE_PATH = "/three-twelve";

export const PLAY_AT = { hour: 18, minute: 12 } as const;
export const ARM_LEAD = { minutes: 3 } as const;
export const STARTUP = { probes: 90, spacing: { seconds: 1 } } as const;
export const CRON = `${PLAY_AT.minute - ARM_LEAD.minutes} ${PLAY_AT.hour} * * *`;

export const PLAYER_IMAGE = "PlayerImage";
export const PLAYER_ENTRYPOINT = ["node", "/app/player.mjs"] as const;
export const AUDIO_KEY = "3ji12fun.ogg";

export const OWNER_DISCORD_ID = "687942167217307658";

export const INVITE_PERMISSIONS = String(
  BigInteger.sumAll([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.Connect,
    PermissionFlagsBits.Speak,
  ]),
);
