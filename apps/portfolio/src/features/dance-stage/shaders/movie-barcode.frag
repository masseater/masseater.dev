// note: 下の帯は、28.8 秒の踊り全体の各コマを 1 本の縦線の平均色に縮め、時間順に左から並べたものである。上の映像が今どこを再生しているかを、帯の上の白い線で示す。
void main() {
  vec3 c = vec3(0.08);
  if (uv.y < 0.66) {
    vec2 p = (uv - vec2(0.5 - 0.66 * 0.5, 0.0)) / vec2(0.66, 0.66);
    c = rgbOr(p, vec3(0.08));
  } else if (uv.y > 0.72 && uv.y < 0.95) {
    float index = floor(clamp((uv.x - 0.04) / 0.92, 0.0, 0.999) * HISTORY_FRAMES);
    vec3 s = vec3(0.0);
    for (int i = 0; i < 3; i++) for (int j = 0; j < 3; j++) s += historyTile(vec2(0.2 + 0.3 * float(i), 0.2 + 0.3 * float(j)), index, 0.0).rgb;
    c = s / 9.0;
    c = mix(c, vec3(0.08), step(uv.x, 0.04) + step(0.96, uv.x));
    float now = 0.04 + 0.92 * mod(time, DURATION) / DURATION;
    c = mix(c, vec3(1.0), step(abs(uv.x - now), 0.0015));
  }
  outColor = vec4(c, 1.0);
}
