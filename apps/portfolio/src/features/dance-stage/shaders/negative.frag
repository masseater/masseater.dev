// note: 明暗と色をすべて反転する。4 秒ごとに元の画と切り替える。
void main() {
  vec3 c = rgb(uv);
  outColor = vec4(mix(c, 1.0 - c, step(0.5, fract(time / 4.0))), 1.0);
}
