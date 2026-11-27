# @masseater.dev/tachie

This workspace draws a PSD character in a Remotion composition the way PSDToolKit does it. It handles layer states, PSDTool favorites, blinking, and lip sync. Lip sync follows VOICEVOX phonemes or the volume of the voice. `libs/video-kit` uses it for the narrator.

```tsx
<PsdCharacter
  psd={staticFile("tsumugi.psd")}
  favorites={staticFile("tsumugi.pfv")}
  parts={[
    "S.お気に入り/*表情/目口~笑う",
    { kind: "blink", closed: "v1.!目/*閉じ", half: "v1.!目/*半目", open: "v1.!目/*開き" },
    { kind: "vowel-mouth", vowelA: "v1.!口/*あ", vowelI: "v1.!口/*い", vowelU: "v1.!口/*う", vowelE: "v1.!口/*え", vowelO: "v1.!口/*お", closed: "v1.!口/*ん" },
  ]}
  voices={[{ from: 30, phonemes: phonemesFromAudioQuery(query), audio: staticFile("line1.wav") }]}
/>
```

Layer states, favorites, blinking and lip sync follow [PSDToolKit2](https://github.com/oov/aviutl2_psdtoolkit2). A state string copied from PSDToolKit or PSDTool gives the same picture. When the two differ, PSDToolKit is right. `phonemesFromAudioQuery` lays out phonemes the way the VOICEVOX engine does, so it needs no `.lab` file.

Character art is someone else's work. Put the PSD and its favorites in the video's cache, never in this repository. Tests use a synthetic PSD that `character.test.support.ts` writes with ag-psd.
