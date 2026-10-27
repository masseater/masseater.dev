// note: 踊りの映像を解説の画面として大きく出し、右下に丸い顔の合成音声のキャラクター 2 人を並べる。下の欄に 2 人の掛け合いの台詞を交互に出し、話している方を小さく跳ねさせる。
// text: 霊：今日はセイキンダンスを解説するよ
// text: 魔：腕の上げ方に注目なんだぜ
// text: 霊：拍に合わせて片足を上げるのね
// text: 魔：まねして踊ってみるといいぜ
void main() {
  vec3 c = rgb(uv);
  int line = int(mod(floor(time / 3.0), 4.0));
  float talker = mod(float(line), 2.0);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float bounce = step(abs(talker - fi), 0.0) * abs(sin(time * 10.0)) * 0.01;
    vec2 head = vec2(0.7 + fi * 0.14, 0.7 - bounce);
    float d = dist(uv, head);
    vec3 hair = i == 0 ? vec3(0.25, 0.12, 0.08) : vec3(0.95, 0.85, 0.4);
    c = mix(c, hair, smoothstep(0.075, 0.07, d));
    c = mix(c, vec3(1.0, 0.88, 0.78), smoothstep(0.06, 0.055, dist(uv, head + vec2(0.0, 0.012))) * step(head.y - 0.02, uv.y));
    c = mix(c, vec3(0.1), smoothstep(0.009, 0.006, dist(uv, head + vec2(-0.015, 0.02))) + smoothstep(0.009, 0.006, dist(uv, head + vec2(0.015, 0.02))));
    vec3 bow = i == 0 ? vec3(0.9, 0.1, 0.15) : vec3(0.1, 0.1, 0.12);
    c = mix(c, bow, smoothstep(0.03, 0.025, dist(uv, head + vec2(0.0, -0.07))) * (i == 0 ? 1.0 : 0.0));
    c = mix(c, bow, step(abs(uv.x - head.x) * aspect(), 0.09) * step(abs(uv.y - head.y + 0.075), 0.012) * (i == 1 ? 1.0 : 0.0));
  }
  if (uv.y > 0.82) {
    c = mix(c, vec3(0.05, 0.05, 0.15), 0.75);
    vec3 col = talker < 0.5 ? vec3(1.0, 0.75, 0.75) : vec3(1.0, 0.95, 0.6);
    c = mix(c, col, textBox(uv, vec2(0.5, 0.91), 0.055, line));
  }
  outColor = vec4(c, 1.0);
}
