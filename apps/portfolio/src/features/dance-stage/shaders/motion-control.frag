// note: カメラが同じ横移動と寄りを 6 秒ごとに正確に繰り返す。動きがぴったり同じなので、時間をずらした 3 回分の踊りを 1 つの画に重ねて 3 人に見せられる。
void main() {
  float phase = fract(time / 6.0);
  float pan = (phase - 0.5) * 0.15;
  float zoom = 1.0 + 0.15 * sin(phase * PI);
  vec2 p = (uv - 0.5) / zoom + 0.5 + vec2(pan, 0.0);
  vec3 c = plate(p);
  for (int i = 0; i < 3; i++) {
    vec2 q = p - vec2((float(i) - 1.0) * 0.27, 0.0);
    float t = time - float(i) * 0.8;
    c = mix(c, pastRgb(q, t), pastMatte(q, t) * inside(q));
  }
  outColor = vec4(c, 1.0);
}
