import { defineRelations } from "drizzle-orm";

import { part, partStaff } from "./part.table";
import { person, personAlias } from "./person.table";
import { song, songAlias } from "./song.table";
import { video } from "./video.table";

const catalogRelations = defineRelations(
  { song, songAlias, video, person, personAlias, part, partStaff },
  (relate) => ({
    song: {
      aliases: relate.many.songAlias({ from: relate.song.id, to: relate.songAlias.songId }),
      parts: relate.many.part({ from: relate.song.id, to: relate.part.songId }),
    },
    songAlias: {
      song: relate.one.song({ from: relate.songAlias.songId, to: relate.song.id }),
    },
    video: {
      parts: relate.many.part({ from: relate.video.id, to: relate.part.videoId, alias: "parts" }),
      quotedBy: relate.many.part({
        from: relate.video.id,
        to: relate.part.refVideoId,
        alias: "quotes",
      }),
    },
    person: {
      aliases: relate.many.personAlias({ from: relate.person.id, to: relate.personAlias.personId }),
      credits: relate.many.partStaff({ from: relate.person.id, to: relate.partStaff.personId }),
    },
    personAlias: {
      person: relate.one.person({ from: relate.personAlias.personId, to: relate.person.id }),
    },
    part: {
      video: relate.one.video({
        from: relate.part.videoId,
        to: relate.video.id,
        alias: "parts",
        optional: false,
      }),
      song: relate.one.song({ from: relate.part.songId, to: relate.song.id }),
      refVideo: relate.one.video({
        from: relate.part.refVideoId,
        to: relate.video.id,
        alias: "quotes",
      }),
      staff: relate.many.partStaff({ from: relate.part.id, to: relate.partStaff.partId }),
    },
    partStaff: {
      part: relate.one.part({ from: relate.partStaff.partId, to: relate.part.id, optional: false }),
      person: relate.one.person({
        from: relate.partStaff.personId,
        to: relate.person.id,
        optional: false,
      }),
    },
  }),
);

export { catalogRelations };
