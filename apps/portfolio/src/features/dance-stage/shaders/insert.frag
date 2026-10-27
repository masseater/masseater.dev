// note: 引きの画の途中に、3 秒ごとに右手の寄りを 0.8 秒だけ差し込む。手元の細かい動きを見せてから元の画に戻る。
void main() {
  float phase = fract(time / 3.0);
  vec2 p = uv;
  if (phase > 0.7) p = (uv - 0.5) / 3.2 + joint(16);
  outColor = vec4(rgb(p), 1.0);
}
