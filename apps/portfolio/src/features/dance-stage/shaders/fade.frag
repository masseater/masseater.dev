// note: 6 秒ごとに画をゆっくり黒へ落とし、黒からまたゆっくり浮かび上がらせる。
void main() {
  float phase = fract(time / 6.0);
  float k = smoothstep(0.0, 0.25, abs(phase - 0.75));
  outColor = vec4(rgb(uv) * k, 1.0);
}
