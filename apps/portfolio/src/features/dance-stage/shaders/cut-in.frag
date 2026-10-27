// note: 6 秒ごとに斜めの帯を画面へ滑り込ませ、帯の中に踊る人の顔を大きく寄せて集中線を重ね、決め台詞の字を出す。1 秒見せて帯を反対側へ抜く。
// text: 必殺！セイキンダンス
void main() {
  vec3 c = rgb(uv);
  float t = mod(time, 6.0);
  float inT = smoothstep(4.5, 4.75, t);
  float outT = smoothstep(5.75, 6.0, t);
  float offset = (1.0 - inT) * 1.5 - outT * 1.5;
  vec2 q = vec2(uv.x * aspect() + offset * aspect(), uv.y);
  float bandDist = abs((q.y - 0.5) - (q.x - 0.5 * aspect()) * -0.25);
  if (bandDist < 0.18 && t > 4.5) {
    vec2 face = joint(0);
    vec2 p = face + (uv - 0.5 + vec2(offset, 0.0)) * 0.3;
    vec3 close = rgb(p) * vec3(1.1, 0.95, 0.9);
    vec2 d = uv - vec2(0.5 - offset, 0.5);
    float lines = step(0.8, hash(vec2(floor(atan(d.y, d.x) * 40.0), floor(time * 12.0)))) * smoothstep(0.1, 0.4, length(d * vec2(aspect(), 1.0)));
    c = mix(close, vec3(1.0), lines * 0.7);
    c = mix(c, vec3(1.0, 0.85, 0.2), smoothstep(0.003, 0.0, abs(bandDist - 0.175)));
    c = mix(c, vec3(0.0), textBox(uv + vec2(offset, 0.0) + vec2(0.003, -0.004), vec2(0.62, 0.62), 0.08, 0));
    c = mix(c, vec3(1.0, 0.9, 0.2), textBox(uv + vec2(offset, 0.0), vec2(0.62, 0.62), 0.08, 0));
  }
  outColor = vec4(c, 1.0);
}
