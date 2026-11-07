import { Array, String, pipe } from "effect";

interface Alias {
  readonly name: string;
  readonly aliases: readonly string[];
}

const LATIN = /^[a-z]+$/u;

const wordsOf = (text: string): readonly string[] =>
  pipe(
    text,
    String.replaceAll(/(?<lower>\p{Ll})(?<upper>\p{Lu})/gu, "$<lower> $<upper>"),
    String.toLowerCase,
    String.split(/[^\p{L}\p{N}]+/u),
    Array.filter(String.isNonEmpty),
  );

const mentions =
  (text: string, words: readonly string[]) =>
  (term: string): boolean =>
    pipe(words, Array.contains(term)) || (!LATIN.test(term) && pipe(text, String.includes(term)));

const namesIn =
  (table: readonly Alias[]) =>
  (text: string): readonly string[] => {
    const words = wordsOf(text);
    return pipe(
      table,
      Array.filter(({ name, aliases }) =>
        pipe([name, ...aliases], Array.some(mentions(text, words))),
      ),
      Array.map(({ name }) => name),
    );
  };

const AVATARS: readonly Alias[] = [
  { name: "桔梗", aliases: ["kikyo", "kikyou"] },
  { name: "セレスティア", aliases: ["selestia", "celestia"] },
  { name: "萌", aliases: ["moe"] },
  { name: "ラスク", aliases: ["rusk"] },
  { name: "マヌカ", aliases: ["manuka"] },
  { name: "舞夜", aliases: ["maya"] },
  { name: "森羅", aliases: ["shinra"] },
  { name: "カリン", aliases: ["karin"] },
  { name: "シフォン", aliases: ["chiffon"] },
  { name: "竜胆", aliases: ["rindo", "rindou"] },
  { name: "薄荷", aliases: ["hakka"] },
  { name: "ライム", aliases: ["lime"] },
  { name: "卯月", aliases: ["uzuki"] },
  { name: "ミルティナ", aliases: ["milltina", "miltina"] },
  { name: "リーファ", aliases: ["leefa"] },
  { name: "キプフェル", aliases: ["kipfel"] },
  { name: "瑞希", aliases: ["mizuki"] },
  { name: "愛莉", aliases: ["airi"] },
  { name: "ソフィナ", aliases: ["sophina"] },
  { name: "ショコラ", aliases: ["chocolat"] },
  { name: "ルルネ", aliases: ["rurune"] },
  { name: "しなの", aliases: ["shinano"] },
  { name: "まめひなた", aliases: ["mamehinata"] },
  { name: "ウルフェリア", aliases: ["wolferia"] },
  { name: "ラシューシャ", aliases: ["lasyusha"] },
  { name: "イメリス", aliases: ["imeris"] },
  { name: "ミーシェ", aliases: ["mishe"] },
  { name: "くろなつ", aliases: ["kuronatu", "kuronatsu"] },
];

const COLORS: readonly Alias[] = [
  { name: "黒", aliases: ["black", "blk"] },
  { name: "白", aliases: ["white", "wht"] },
  { name: "赤", aliases: ["red"] },
  { name: "青", aliases: ["blue"] },
  { name: "水色", aliases: ["cyan", "lightblue", "aqua"] },
  { name: "紺", aliases: ["navy"] },
  { name: "緑", aliases: ["green"] },
  { name: "黄", aliases: ["yellow"] },
  { name: "橙", aliases: ["orange"] },
  { name: "ピンク", aliases: ["pink"] },
  { name: "紫", aliases: ["purple", "violet"] },
  { name: "茶", aliases: ["brown"] },
  { name: "灰", aliases: ["gray", "grey"] },
  { name: "ベージュ", aliases: ["beige"] },
  { name: "クリーム", aliases: ["cream"] },
  { name: "金", aliases: ["gold"] },
  { name: "銀", aliases: ["silver"] },
];

const avatarsIn = namesIn(AVATARS);

const colorsIn = namesIn(COLORS);

export { avatarsIn, colorsIn, wordsOf };
