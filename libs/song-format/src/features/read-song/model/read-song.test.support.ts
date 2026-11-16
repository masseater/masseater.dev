export const header = `song "two five one"

kit studio {
  kick  "kick.flac"
  snare "snare.flac" gain -3dB
  hat   "hat.flac"
}
instrument keys sample "keys.flac" root C4
instrument bass sample "bass.flac" root C2
sample break "break.flac" slices 16

bus room fx [reverb ir "room.flac" mix 30%]

track drums kit studio
track keys  instrument keys role harmony fx [chorus 3ms 0.5Hz 40%] send room 20%
track bass  instrument bass role bass volume -4.5dB pan -20% mute
track loop  audio
`;

export const twoFiveOne = `${header}
bar meter 4/4 tempo 120bpm section verse mark "start" {
  drums: kick 1/4, snare 1/4, kick 1/4, snare 1/4
  drums: hat 1/8, hat 1/8, hat 1/8, hat 1/8, hat 1/8, hat 1/8, hat 1/8, hat 1/8
  keys:  [D4 F4 A4 C5] 1/1
  bass:  D2 1/2, A1 1/2
}
bar {
  drums: kick 1/4, snare 1/4, kick 1/4, snare 1/4
  keys:  [D4 F4 G4 B4] 1/1
  bass:  G1 1/2, D2 1/2
}
bar {
  keys:  [E4 G4 B4 C5] 1/1 tie
  bass:  C2 1/1
}
bar {
  keys:  [E4 G4 B4 C5] 1/2, rest 1/2
  bass:  C2 1/2, rest 1/2
}
`;

export const oddMeter = `${header}
bar meter 7/8 (2+2+3) tempo 150bpm {
  drums: kick 1/4, kick 1/4, snare 3/8
  bass:  tuplet 3:2 { C2 1/8, D2 1/8, E2 1/8 }, F2 1/4, G2 3/8
}
bar meter 5/4 (3+2) {
  loop:  break.slice(0) 1/4, break.slice(3) 1/4 reverse, stutter 1/4 every 1/32 x8, rest 1/2
}
`;

export const withLine = (line: string): string => `${header}
bar meter 4/4 tempo 120bpm {
${line}
}
`;
