// note: 踊りの途中で、4 秒ごとにソファの寄りへ 1 秒だけ切り替え、また踊りへ戻る。本筋から離れた別の物を一瞬見せる。
void main() {
  float phase = fract(time / 4.0);
  vec3 c = rgb(uv);
  if (phase > 0.75) {
    vec2 p = (uv - 0.5) / 3.0 + vec2(0.83, 0.72) + vec2((phase - 0.75) * 0.1, 0.0);
    c = plate(p);
  }
  outColor = vec4(c, 1.0);
}
