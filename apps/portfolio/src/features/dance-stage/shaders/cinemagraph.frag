// note: 5 秒目の画を保存して止め、右手のまわりの丸い範囲だけを動かし続ける。写真の中で一か所だけが動いて見える。
// pass: still persistent
uniform sampler2D still;
void main() {
  vec4 last = read(still, uv);
  outColor = last.a < 0.5 ? vec4(rgb(uv), step(5.0, time)) : last;
}
// pass:
uniform sampler2D still;
void main() {
  vec2 hand = vec2(0.62, 0.42);
  float live = smoothstep(0.2, 0.14, dist(uv, hand));
  vec3 c = mix(read(still, uv).rgb, rgb(uv), live);
  outColor = vec4(c, 1.0);
}
